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

async function mineBlocks(count: number) {
  for (let i = 0; i < count; i += 1) {
    await network.provider.send("evm_mine");
  }
}

async function mineAt(timestamp: number) {
  await network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  await network.provider.send("evm_mine");
}

async function deployGovernance() {
  const [deployer, proposer, voter, outsider] = await ethers.getSigners();

  const votesFactory = await ethers.getContractFactory("MockVotesToken");
  const votes = await votesFactory.deploy();
  await votes.deployed();

  const targetFactory = await ethers.getContractFactory("MockGovernedTarget");
  const target = await targetFactory.deploy();
  await target.deployed();

  const nonce = await deployer.getTransactionCount();
  const predictedDAO = ethers.utils.getContractAddress({
    from: deployer.address,
    nonce: nonce + 1,
  });

  const timelockFactory = await ethers.getContractFactory("Timelock");
  const timelock = await timelockFactory.deploy(predictedDAO, 60);
  await timelock.deployed();

  const daoFactory = await ethers.getContractFactory("DAO");
  const dao = await daoFactory.deploy(
    timelock.address,
    votes.address,
    1,
    3,
    100,
    10
  );
  await dao.deployed();

  expect(dao.address.toLowerCase()).to.equal(predictedDAO.toLowerCase());

  return { proposer, voter, outsider, votes, target, timelock, dao };
}

describe("DAO and Timelock", function () {
  it("queues and executes a real target call after token voting and timelock delay", async function () {
    const { proposer, voter, votes, target, dao } = await deployGovernance();
    await votes.setVotes(proposer.address, 25);
    await votes.setVotes(voter.address, 125);

    const data = target.interface.encodeFunctionData("setValue", [42]);
    await dao.connect(proposer).createProposal(target.address, data, "Set value");

    await mineBlocks(1);
    await dao.connect(voter).vote(1, true);
    await mineBlocks(4);

    await expectRevert(
      dao.connect(voter).queueProposal(1, 1),
      "DelayTooShort"
    );

    await dao.connect(voter).queueProposal(1, 60);
    await expectRevert(
      dao.connect(voter).executeProposal(1),
      "ExecutionNotReady"
    );

    await mineAt((await latestTimestamp()) + 61);
    await dao.connect(voter).executeProposal(1);

    expect((await target.value()).toString()).to.equal("42");
  });

  it("rejects proposals and votes without snapshot voting power", async function () {
    const { outsider, proposer, votes, target, dao } = await deployGovernance();
    await votes.setVotes(proposer.address, 25);

    const data = target.interface.encodeFunctionData("setValue", [7]);
    await expectRevert(
      dao.connect(outsider).createProposal(target.address, data, "No votes"),
      "ProposalThresholdNotMet"
    );

    await dao.connect(proposer).createProposal(target.address, data, "Set value");
    await mineBlocks(1);

    await expectRevert(
      dao.connect(outsider).vote(1, true),
      "NoVotingPower"
    );
  });
});
