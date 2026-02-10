"use client";

export function PhantomConnect() {
  async function connect() {
    if (!window.solana?.isPhantom) {
      alert("Install Phantom wallet");
      return;
    }

    const resp = await window.solana.connect();
    console.log("Phantom connected:", resp.publicKey.toString());
  }

  return (
    <button
      onClick={connect}
      className="w-full border rounded-md px-4 py-2"
    >
      Continue with Phantom
    </button>
  );
}
