from enum import Enum
from typing import Optional
from dataclasses import dataclass, asdict
from datetime import datetime


class AssetType(str, Enum):
    BTC = "BTC"
    ETH = "ETH"
    SOL = "SOL"


class Direction(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"


class PositionStatus(str, Enum):
    PENDING = "PENDING"
    OPEN = "OPEN"
    CLOSED_WIN = "CLOSED_WIN"
    CLOSED_LOSS = "CLOSED_LOSS"
    LIQUIDATED = "LIQUIDATED"


@dataclass
class OpenPositionRequest:
    asset: str
    direction: str
    leverage: float
    stake: float
    duration: int
    wallet_address: Optional[str] = None


@dataclass
class Position:
    id: str
    asset: str
    direction: str
    leverage: float
    stake: float
    duration: int
    stop_loss_percent: float
    status: str
    entry_price: Optional[float] = None
    current_price: Optional[float] = None
    pnl_percent: float = 0.0
    pnl_dollars: float = 0.0
    opened_at: Optional[str] = None
    closed_at: Optional[str] = None
    time_remaining: Optional[float] = None
    wallet_address: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)


@dataclass
class PositionResponse:
    position: Position
    balance: float
    
    def to_dict(self):
        return {
            "position": self.position.to_dict(),
            "balance": self.balance
        }


@dataclass
class BalanceResponse:
    balance: float
    wallet_address: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)
