import pytest
import os

os.environ.setdefault("JWT_SECRET", "test-jwt-secret-32chars-minimum-123")

eth_account = pytest.importorskip("eth_account")
from eth_account import Account
from eth_account.messages import encode_defunct

from backend.security.auth import verify_wallet_signature


def test_verify_wallet_signature_accepts_valid_evm_signature():
    wallet = Account.create()
    message = "moltmarket-auth-nonce-123"
    signed = Account.sign_message(encode_defunct(text=message), wallet.key)

    assert verify_wallet_signature(
        address=wallet.address,
        signature=signed.signature.hex(),
        message=message,
    )


def test_verify_wallet_signature_rejects_wrong_address():
    signer = Account.create()
    other = Account.create()
    message = "moltmarket-auth-nonce-456"
    signed = Account.sign_message(encode_defunct(text=message), signer.key)

    assert not verify_wallet_signature(
        address=other.address,
        signature=signed.signature.hex(),
        message=message,
    )


def test_verify_wallet_signature_rejects_non_evm_address():
    assert not verify_wallet_signature(
        address="So11111111111111111111111111111111111111112",
        signature="deadbeef",
        message="test",
    )
