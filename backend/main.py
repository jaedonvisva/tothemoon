from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import models
from models import (
    OpenPositionRequest, 
    Position, 
    PositionResponse, 
    BalanceResponse,
    AssetType
)
from price_service import PriceService
from position_manager import PositionManager


price_service = PriceService()
position_manager = PositionManager(price_service)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await price_service.start()
    yield
    await price_service.stop()


app = FastAPI(
    title="Moonshot Trading API",
    description="Backend API for gamified crypto trading with real-time price feeds",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Moonshot Trading API",
        "status": "online",
        "price_feed_connected": price_service.is_connected
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "price_feed_connected": price_service.is_connected,
        "active_positions": len(position_manager.active_tasks)
    }


@app.get("/prices")
async def get_prices():
    prices = price_service.get_all_prices()
    if not prices:
        raise HTTPException(status_code=503, detail="Price feed not available")
    return {
        "prices": prices,
        "connected": price_service.is_connected
    }


@app.get("/balance")
async def get_balance():
    response = BalanceResponse(
        balance=position_manager.get_balance(),
        wallet_address=None
    )
    return response.to_dict()


@app.post("/positions/open")
async def open_position(request: dict):
    try:
        req = OpenPositionRequest(**request)
        asset = AssetType(req.asset)
        direction = models.Direction(req.direction)
        
        position, new_balance = await position_manager.create_position(
            asset=asset,
            direction=direction,
            leverage=req.leverage,
            stake=req.stake,
            duration=req.duration,
            wallet_address=req.wallet_address
        )
        
        response = PositionResponse(
            position=position,
            balance=new_balance
        )
        return response.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open position: {str(e)}")


@app.get("/positions/{position_id}")
async def get_position(position_id: str):
    position = position_manager.get_position(position_id)
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    return position.to_dict()


@app.get("/positions")
async def get_all_positions():
    positions = position_manager.get_all_positions()
    return {
        "positions": [p.to_dict() for p in positions],
        "total": len(positions)
    }


@app.post("/balance/reset")
async def reset_balance():
    position_manager.set_balance(1000.0)
    response = BalanceResponse(
        balance=position_manager.get_balance(),
        wallet_address=None
    )
    return response.to_dict()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
