from typing import TypedDict, List, Optional


class AgentStep(TypedDict):
    agent: str        # "demand" | "inventory" | "logistics"
    message: str
    detail: Optional[str]
    level: str        # "info" | "warning" | "success" | "error"
    timestamp: str


class DemandItem(TypedDict):
    item_id: int
    item_name: str
    category: str
    sku_segment: str
    current_stock: float
    reorder_point: float
    safety_stock: float
    days_until_stockout: float
    avg_daily_demand: float
    festival_boost: float
    urgency: str      # "critical" | "high" | "normal"
    lead_time_days: int


class OrderItem(TypedDict):
    item_id: int
    item_name: str
    category: str
    order_qty: int
    unit_cost: float
    subtotal: float
    festival_adjusted: bool
    urgency: str
    current_stock: float
    lead_time_days: int


class AgentState(TypedDict):
    run_id: str
    store_id: int
    store_name: str
    steps: List[AgentStep]
    demand_analysis: List[DemandItem]
    validated_orders: List[OrderItem]
    purchase_order_id: Optional[str]
    status: str       # "running" | "done" | "error"
    error: Optional[str]
