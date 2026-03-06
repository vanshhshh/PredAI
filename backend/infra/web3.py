# backend/infra/web3.py

from web3 import Web3
from backend.core.config import settings

try:
    from web3.middleware import geth_poa_middleware as _poa_middleware
except ImportError:  # web3>=7
    from web3.middleware import ExtraDataToPOAMiddleware as _poa_middleware

w3 = Web3(Web3.HTTPProvider(settings.RPC_URL))
w3.middleware_onion.inject(_poa_middleware, layer=0)

def get_chain_id():
    return w3.eth.chain_id
