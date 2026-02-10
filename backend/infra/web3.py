# backend/infra/web3.py

from web3 import Web3
from backend.core.config import settings

w3 = Web3(Web3.HTTPProvider(settings.RPC_URL))

def get_chain_id():
    return w3.eth.chain_id
