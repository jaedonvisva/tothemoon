import asyncio
import json
import websockets
from typing import Dict, Optional
from models import AssetType


PYTH_WS_URL = "wss://hermes.pyth.network/ws"

PRICE_FEEDS = {
    AssetType.BTC: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    AssetType.ETH: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    AssetType.SOL: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
}


class PriceService:
    def __init__(self):
        self.prices: Dict[AssetType, float] = {}
        self.websocket = None
        self.connection_task = None
        self.is_connected = False
    
    async def start(self):
        """Start the price feed WebSocket connection."""
        self.connection_task = asyncio.create_task(self._maintain_connection())
    
    async def stop(self):
        """Stop the price feed connection."""
        if self.websocket:
            await self.websocket.close()
        if self.connection_task:
            self.connection_task.cancel()
    
    def get_price(self, asset: AssetType) -> Optional[float]:
        """Get current price for an asset."""
        return self.prices.get(asset)
    
    def get_all_prices(self) -> Dict[str, float]:
        """Get all current prices."""
        return {asset.value: price for asset, price in self.prices.items()}
    
    def calculate_price(self, price_str: str, expo: int) -> float:
        """Calculate actual price from raw price and exponent."""
        price = float(price_str)
        return price * (10 ** expo)
    
    async def _maintain_connection(self):
        """Maintain WebSocket connection with auto-reconnect."""
        while True:
            try:
                await self._connect_and_subscribe()
            except Exception as e:
                print(f"Price feed error: {e}")
                self.is_connected = False
                await asyncio.sleep(3)
    
    async def _connect_and_subscribe(self):
        """Connect to Pyth Network and subscribe to price feeds."""
        async with websockets.connect(PYTH_WS_URL) as websocket:
            self.websocket = websocket
            self.is_connected = True
            print("Price service connected to Pyth Network")
            
            subscribe_message = {
                "ids": list(PRICE_FEEDS.values()),
                "type": "subscribe",
                "verbose": True
            }
            
            await websocket.send(json.dumps(subscribe_message))
            
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                
                if data.get("type") == "price_update":
                    self._process_price_update(data)
    
    def _process_price_update(self, data: dict):
        """Process price update message."""
        price_feed = data.get("price_feed", {})
        feed_id = price_feed.get("id")
        
        for asset, id_val in PRICE_FEEDS.items():
            if id_val == feed_id:
                if "price" in price_feed:
                    price_data = price_feed["price"]
                    price_str = price_data.get("price")
                    expo = price_data.get("expo")
                    
                    if price_str and expo is not None:
                        actual_price = self.calculate_price(price_str, expo)
                        self.prices[asset] = actual_price
                break
