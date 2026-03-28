import asyncio
import json
import websockets
from datetime import datetime


PYTH_WS_URL = "wss://hermes.pyth.network/ws"

PRICE_FEEDS = {
    "BTC": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    "ETH": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "SOL": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
}


def calculate_price(price_str, expo):
    """Calculate actual price from raw price and exponent."""
    price = float(price_str)
    return price * (10 ** expo)


async def subscribe_to_prices():
    """Connect to Pyth Network and stream price updates."""
    
    async with websockets.connect(PYTH_WS_URL) as websocket:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Connected to Pyth Network")
        print("-" * 80)
        
        subscribe_message = {
            "ids": list(PRICE_FEEDS.values()),
            "type": "subscribe",
            "verbose": True
        }
        
        await websocket.send(json.dumps(subscribe_message))
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Subscribed to BTC, ETH, SOL price feeds")
        print("=" * 80)
        print()
        
        while True:
            try:
                message = await websocket.recv()
                data = json.loads(message)
                
                if data.get("type") == "price_update":
                    price_feed = data.get("price_feed", {})
                    feed_id = price_feed.get("id")
                    
                    asset_name = None
                    for name, id_val in PRICE_FEEDS.items():
                        if id_val == feed_id:
                            asset_name = name
                            break
                    
                    if asset_name and "price" in price_feed:
                        price_data = price_feed["price"]
                        price_str = price_data.get("price")
                        expo = price_data.get("expo")
                        
                        if price_str and expo is not None:
                            actual_price = calculate_price(price_str, expo)
                            timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                            
                            print(f"[{timestamp}] {asset_name:>3} | ${actual_price:>12,.2f}")
                            
            except websockets.exceptions.ConnectionClosed:
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Connection closed. Reconnecting in 3s...")
                await asyncio.sleep(3)
                break
            except Exception as e:
                print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Error: {e}")
                await asyncio.sleep(1)


async def main():
    """Main function with auto-reconnect."""
    print("=" * 80)
    print(" " * 25 + "MOONSHOT PRICE FEED")
    print("=" * 80)
    print()
    
    while True:
        try:
            await subscribe_to_prices()
        except Exception as e:
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Connection error: {e}")
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Retrying in 3 seconds...")
            await asyncio.sleep(3)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nShutting down price feed...")
