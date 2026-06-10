import { expect } from "chai";
import { ethers, network } from "hardhat";

async function expectRevert(
  txPromise: Promise<unknown>,
  expectedMessage: string
) {
  try {
    await txPromise;
    expect.fail(`Expected transaction to revert with ${expectedMessage}`);
  } catch (error) {
    const message = (error as Error).message ?? "";
    expect(message).to.contain(expectedMessage);
  }
}

async function latestTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}

async function mineAt(timestamp: number) {
  await network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  await network.provider.send("evm_mine");
}

async function deployProtocol(feeBps = 100, disputeWindow = 60, creationBond = 0) {
  const [governance, oracle, creator, yesBettor, noBettor, treasury, attacker] =
    await ethers.getSigners();

  const tokenFactory = await ethers.getContractFactory("MockCollateral");
  const collateral = await tokenFactory.deploy();
  await collateral.deployed();

  const registryFactory = await ethers.getContractFactory("MarketRegistry");
  const registry = await registryFactory.deploy(governance.address, governance.address);
  await registry.deployed();

  const settlementFactory = await ethers.getContractFactory("SettlementEngine");
  const settlement = await settlementFactory.deploy(
    governance.address,
    oracle.address,
    registry.address
  );
  await settlement.deployed();

  const marketFactoryFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await marketFactoryFactory.deploy(
    governance.address,
    registry.address,
    1,
    10_000,
    1_000_000,
    creationBond,
    settlement.address,
    collateral.address,
    treasury.address,
    feeBps,
    disputeWindow
  );
  await marketFactory.deployed();
  await registry.updateFactory(marketFactory.address);

  return {
    governance,
    oracle,
    creator,
    yesBettor,
    noBettor,
    treasury,
    attacker,
    collateral,
    registry,
    settlement,
    marketFactory,
    disputeWindow,
  };
}

async function createMarket(protocol: Awaited<ReturnType<typeof deployProtocol>>) {
  const start = (await latestTimestamp()) + 5;
  const end = start + 120;
  const marketId = ethers.utils.formatBytes32String(`m-${Date.now()}`);
  const creationBond = await protocol.marketFactory.marketCreationBond();

  if (!creationBond.isZero()) {
    await protocol.collateral.mint(protocol.creator.address, creationBond);
    await protocol.collateral.connect(protocol.creator).approve(
      protocol.marketFactory.address,
      creationBond
    );
  }

  const tx = await protocol.marketFactory.connect(protocol.creator).createMarket(
    marketId,
    start,
    end,
    1_000_000,
    "ipfs://market"
  );
  const receipt = await tx.wait();
  const event = receipt.events?.find((item: { event?: string }) => item.event === "MarketCreated");
  const marketAddress = event?.args?.market;
  const market = await ethers.getContractAt("PredictionMarket", marketAddress);

  await mineAt(start + 1);

  return { market, marketAddress, start, end };
}

describe("PredictionMarket protocol flow", function () {
  it("uses ERC20 collateral and settles only through SettlementEngine", async function () {
    const protocol = await deployProtocol(100, 60);
    const { market, marketAddress, end } = await createMarket(protocol);

    await protocol.collateral.mint(protocol.yesBettor.address, 1_000_000);
    await protocol.collateral.mint(protocol.noBettor.address, 1_000_000);
    await protocol.collateral.connect(protocol.yesBettor).approve(marketAddress, 10_000);
    await protocol.collateral.connect(protocol.noBettor).approve(marketAddress, 5_000);

    await market.connect(protocol.yesBettor).betYes(10_000);
    await market.connect(protocol.noBettor).betNo(5_000);

    await mineAt(end + protocol.disputeWindow + 1);

    await expectRevert(
      market.connect(protocol.attacker).settle(true),
      "OnlySettlementAuthority"
    );

    await protocol.settlement.connect(protocol.oracle).settleMarket(marketAddress, true);
    expect(await market.settled()).to.equal(true);
    expect(await market.finalOutcome()).to.equal(true);

    await market.connect(protocol.yesBettor).claim();
    expect((await protocol.collateral.balanceOf(protocol.yesBettor.address)).toString())
      .to.equal("1004950");
    expect((await market.accruedFees()).toString()).to.equal("50");

    await market.withdrawFees();
    expect((await protocol.collateral.balanceOf(protocol.treasury.address)).toString())
      .to.equal("50");
  });

  it("collects market creation bonds in collateral units", async function () {
    const protocol = await deployProtocol(100, 60, 25_000);
    await createMarket(protocol);

    expect((await protocol.collateral.balanceOf(protocol.treasury.address)).toString())
      .to.equal("25000");
  });

  it("cancels markets and refunds both sides without settlement", async function () {
    const protocol = await deployProtocol();
    const { market, marketAddress } = await createMarket(protocol);

    await protocol.collateral.mint(protocol.yesBettor.address, 10_000);
    await protocol.collateral.mint(protocol.noBettor.address, 20_000);
    await protocol.collateral.connect(protocol.yesBettor).approve(marketAddress, 10_000);
    await protocol.collateral.connect(protocol.noBettor).approve(marketAddress, 20_000);

    await market.connect(protocol.yesBettor).betYes(10_000);
    await market.connect(protocol.noBettor).betNo(20_000);

    await expectRevert(
      market.connect(protocol.attacker).cancelMarket(),
      "OnlyGovernance"
    );

    await market.connect(protocol.governance).cancelMarket();
    await market.connect(protocol.yesBettor).claim();
    await market.connect(protocol.noBettor).claim();

    expect((await protocol.collateral.balanceOf(protocol.yesBettor.address)).toString())
      .to.equal("10000");
    expect((await protocol.collateral.balanceOf(protocol.noBettor.address)).toString())
      .to.equal("20000");
  });

  it("refunds everyone when the winning side has no liquidity", async function () {
    const protocol = await deployProtocol();
    const { market, marketAddress, end } = await createMarket(protocol);

    await protocol.collateral.mint(protocol.yesBettor.address, 10_000);
    await protocol.collateral.connect(protocol.yesBettor).approve(marketAddress, 10_000);
    await market.connect(protocol.yesBettor).betYes(10_000);

    await mineAt(end + protocol.disputeWindow + 1);
    await protocol.settlement.connect(protocol.oracle).settleMarket(marketAddress, false);
    await market.connect(protocol.yesBettor).claim();

    expect((await protocol.collateral.balanceOf(protocol.yesBettor.address)).toString())
      .to.equal("10000");
  });

  it("mints outcome tokens only through verified wrapper positions", async function () {
    const protocol = await deployProtocol();
    const { market, marketAddress, end } = await createMarket(protocol);

    await protocol.collateral.mint(protocol.yesBettor.address, 10_000);
    await protocol.collateral.connect(protocol.yesBettor).approve(marketAddress, 10_000);
    await market.connect(protocol.yesBettor).betYes(10_000);

    await mineAt(end + protocol.disputeWindow + 1);
    await protocol.settlement.connect(protocol.oracle).settleMarket(marketAddress, true);

    const wrapperFactory = await ethers.getContractFactory("OutcomeWrapper");
    const wrapper = await wrapperFactory.deploy(protocol.registry.address);
    await wrapper.deployed();

    await wrapper.wrapOutcome(marketAddress);
    const [yesTokenAddress, noTokenAddress] = await wrapper.getOutcomeTokens(marketAddress);
    const yesToken = await ethers.getContractAt("OutcomeToken", yesTokenAddress);
    const noToken = await ethers.getContractAt("OutcomeToken", noTokenAddress);

    await expectRevert(
      yesToken.connect(protocol.attacker).mint(protocol.attacker.address, 1),
      "OnlyWrapper"
    );

    await wrapper.connect(protocol.yesBettor).mintPositionTokens(marketAddress);

    expect((await yesToken.balanceOf(protocol.yesBettor.address)).toString()).to.equal("10000");
    expect((await noToken.balanceOf(protocol.yesBettor.address)).toString()).to.equal("0");

    await expectRevert(
      wrapper.connect(protocol.yesBettor).mintPositionTokens(marketAddress),
      "PositionAlreadyMinted"
    );
  });
});
