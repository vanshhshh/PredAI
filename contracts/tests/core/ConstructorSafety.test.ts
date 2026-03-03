import { expect } from "chai";
import { ethers } from "hardhat";

async function expectRevert(txPromise: Promise<unknown>, expectedMessage: string) {
  try {
    await txPromise;
    expect.fail(`Expected transaction to revert with ${expectedMessage}`);
  } catch (error) {
    const message = (error as Error).message ?? "";
    expect(message).to.contain(expectedMessage);
  }
}

describe("Core constructor safety", function () {
  it("rejects zero market factory in MarketRegistry", async function () {
    const [governance] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("MarketRegistry", governance);

    await expectRevert(
      factory.deploy(governance.address, ethers.constants.AddressZero),
      "INVALID_FACTORY"
    );
  });

  it("rejects zero oracle consensus in SettlementEngine", async function () {
    const [governance] = await ethers.getSigners();

    const registryFactory = await ethers.getContractFactory("MarketRegistry", governance);
    const registry = await registryFactory.deploy(governance.address, governance.address);
    await registry.deployed();

    const settlementFactory = await ethers.getContractFactory("SettlementEngine", governance);
    await expectRevert(
      settlementFactory.deploy(
        governance.address,
        ethers.constants.AddressZero,
        registry.address
      ),
      "INVALID_ORACLE"
    );
  });

  it("deploys SettlementEngine with explicit non-zero oracle consensus", async function () {
    const [governance, oracleConsensus] = await ethers.getSigners();

    const registryFactory = await ethers.getContractFactory("MarketRegistry", governance);
    const registry = await registryFactory.deploy(governance.address, governance.address);
    await registry.deployed();

    const settlementFactory = await ethers.getContractFactory("SettlementEngine", governance);
    const settlement = await settlementFactory.deploy(
      governance.address,
      oracleConsensus.address,
      registry.address
    );
    await settlement.deployed();

    expect(await settlement.oracleConsensus()).to.equal(oracleConsensus.address);
  });
});

