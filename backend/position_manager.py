import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional
from models import Position, PositionStatus, Direction, AssetType


class PositionManager:
    def __init__(self, price_service, broadcast_callback=None):
        self.positions: Dict[str, Position] = {}
        self.balance = 100000.0
        self.price_service = price_service
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.broadcast_callback = broadcast_callback
    
    def calculate_stop_loss(self, leverage: float) -> float:
        """Calculate stop loss percentage based on leverage."""
        return -1.0 / leverage
    
    def calculate_pnl(self, entry_price: float, current_price: float, 
                     direction: Direction, leverage: float) -> tuple[float, float]:
        """Calculate P&L percentage and check liquidation."""
        price_change_percent = ((current_price - entry_price) / entry_price) * 100
        
        directional_pnl = price_change_percent if direction == Direction.LONG else -price_change_percent
        
        leveraged_pnl = directional_pnl * leverage
        
        stop_loss = self.calculate_stop_loss(leverage) * 100
        
        if leveraged_pnl <= stop_loss:
            return stop_loss, True
        
        leveraged_pnl = min(leveraged_pnl, 1000.0)
        
        return leveraged_pnl, False
    
    async def create_position(self, asset: AssetType, direction: Direction, 
                            leverage: float, stake: float, duration: int,
                            wallet_address: Optional[str] = None) -> tuple[Position, float]:
        """Create a new position (PENDING state, waiting for entry)."""
        if stake > self.balance:
            raise ValueError(f"Insufficient balance. Available: ${self.balance:.2f}")
        
        self.balance -= stake
        
        position_id = str(uuid.uuid4())
        stop_loss = self.calculate_stop_loss(leverage)
        
        position = Position(
            id=position_id,
            asset=asset.value,
            direction=direction.value,
            leverage=leverage,
            stake=stake,
            duration=duration,
            stop_loss_percent=stop_loss * 100,
            status=PositionStatus.PENDING.value,
            wallet_address=wallet_address
        )
        
        self.positions[position_id] = position
        
        task = asyncio.create_task(self._countdown_and_open(position_id))
        self.active_tasks[position_id] = task
        
        if self.broadcast_callback:
            asyncio.create_task(
                self.broadcast_callback({
                    "type": "position_update",
                    "data": position.to_dict()
                })
            )
        
        return position, self.balance
    
    async def _countdown_and_open(self, position_id: str):
        """Wait countdown, then open position at market price."""
        await asyncio.sleep(3)
        
        position = self.positions.get(position_id)
        if not position:
            return
        
        asset_enum = AssetType(position.asset)
        current_price = self.price_service.get_price(asset_enum)
        if not current_price:
            position.status = PositionStatus.CLOSED_LOSS.value
            self.balance += 0
            return
        
        position.entry_price = current_price
        position.current_price = current_price
        position.status = PositionStatus.OPEN.value
        position.opened_at = datetime.utcnow().isoformat()
        
        if self.broadcast_callback:
            await self.broadcast_callback({
                "type": "position_update",
                "data": position.to_dict()
            })
        
        await self._track_position(position_id)
    
    async def _track_position(self, position_id: str):
        """Track position until expiry or liquidation."""
        position = self.positions.get(position_id)
        if not position:
            return
        
        opened_time = datetime.fromisoformat(position.opened_at)
        end_time = opened_time + timedelta(seconds=position.duration)
        
        asset_enum = AssetType(position.asset)
        direction_enum = Direction(position.direction)
        
        while datetime.utcnow() < end_time:
            current_price = self.price_service.get_price(asset_enum)
            if not current_price:
                await asyncio.sleep(0.1)
                continue
            
            position.current_price = current_price
            
            pnl_percent, is_liquidated = self.calculate_pnl(
                position.entry_price, 
                current_price, 
                direction_enum, 
                position.leverage
            )
            
            position.pnl_percent = pnl_percent
            position.pnl_dollars = position.stake * (pnl_percent / 100)
            
            time_remaining = (end_time - datetime.utcnow()).total_seconds()
            position.time_remaining = max(0, time_remaining)
            
            if self.broadcast_callback:
                await self.broadcast_callback({
                    "type": "position_update",
                    "data": position.to_dict()
                })
            
            if is_liquidated:
                position.status = PositionStatus.LIQUIDATED.value
                position.closed_at = datetime.utcnow().isoformat()
                position.time_remaining = 0
                if self.broadcast_callback:
                    await self.broadcast_callback({
                        "type": "position_update",
                        "data": position.to_dict()
                    })
                if position_id in self.active_tasks:
                    del self.active_tasks[position_id]
                return
            
            await asyncio.sleep(0.1)
        
        self._close_position(position_id)
    
    def _close_position(self, position_id: str):
        """Close position at expiry."""
        position = self.positions.get(position_id)
        if not position or position.status != PositionStatus.OPEN.value:
            return
        
        position.closed_at = datetime.utcnow().isoformat()
        position.time_remaining = 0
        
        final_amount = position.stake + position.pnl_dollars
        
        if position.pnl_dollars > 0:
            position.status = PositionStatus.CLOSED_WIN.value
        else:
            position.status = PositionStatus.CLOSED_LOSS.value
        
        self.balance += max(0, final_amount)
        
        if self.broadcast_callback:
            asyncio.create_task(
                self.broadcast_callback({
                    "type": "position_update",
                    "data": position.to_dict()
                })
            )
        
        if position_id in self.active_tasks:
            del self.active_tasks[position_id]
    
    def get_position(self, position_id: str) -> Optional[Position]:
        """Get position by ID."""
        return self.positions.get(position_id)
    
    def get_all_positions(self) -> list[Position]:
        """Get all positions."""
        return list(self.positions.values())
    
    def get_balance(self) -> float:
        """Get current balance."""
        return self.balance
    
    def set_balance(self, amount: float):
        """Set balance (for wallet integration later)."""
        self.balance = amount
