"use client";

export function PhantomConnect() {
  async function connect() {
    if (!window.solana?.isPhantom) {
      alert("Install Phantom wallet");
      return;
    }

    const response = await window.solana.connect();
    console.log("Phantom connected:", response.publicKey.toString());
  }

  return (
    <button
      type="button"
      onClick={connect}
      className="ui-btn ui-btn-secondary w-full justify-center"
    >
      Continue with Phantom
    </button>
  );
}
