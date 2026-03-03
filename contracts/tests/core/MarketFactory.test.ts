import { expect } from "chai";
import { ethers } from "hardhat";

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

describe("OracleRegistry", function () {
  it("registers an oracle and activates it via governance", async function () {
    const [governance, oracle] = await ethers.getSigners();

    const registryFactory = await ethers.getContractFactory(
      "OracleRegistry",
      governance
    );
    const registry = await registryFactory.deploy(governance.address);
    await registry.deployed();

    const oracleId = ethers.utils.formatBytes32String("oracle-1");

    const registerTx = await registry
      .connect(oracle)
      .registerOracle(oracleId, "ipfs://oracle-1");
    const registerReceipt = await registerTx.wait();
    expect(registerReceipt.status).to.equal(1);

    expect((await registry.totalOracles()).toNumber()).to.equal(1);
    expect(await registry.isActiveOracle(oracle.address)).to.equal(false);

    const activateTx = await registry.activateOracle(oracle.address);
    const activateReceipt = await activateTx.wait();
    expect(activateReceipt.status).to.equal(1);

    expect(await registry.isActiveOracle(oracle.address)).to.equal(true);
  });

  it("rejects empty metadata and non-governance activation", async function () {
    const [governance, oracle, attacker] = await ethers.getSigners();

    const registryFactory = await ethers.getContractFactory(
      "OracleRegistry",
      governance
    );
    const registry = await registryFactory.deploy(governance.address);
    await registry.deployed();

    const oracleId = ethers.utils.formatBytes32String("oracle-2");

    await expectRevert(
      registry.connect(oracle).registerOracle(oracleId, ""),
      "InvalidMetadata"
    );

    await registry
      .connect(oracle)
      .registerOracle(oracleId, "ipfs://oracle-2");

    await expectRevert(
      registry.connect(attacker).activateOracle(oracle.address),
      "OnlyGovernance"
    );
  });
});
