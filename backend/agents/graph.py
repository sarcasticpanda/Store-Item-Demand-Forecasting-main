"""
LangGraph state machine wiring the three agents in sequence:
  demand_node → inventory_node → logistics_node
"""
# langchain 1.x removed the `debug` attribute that langgraph 0.2.x tries to set
import langchain as _lc
if not hasattr(_lc, "debug"):
    _lc.debug = False

from langgraph.graph import StateGraph, END

from .state import AgentState
from .demand_agent    import demand_node
from .inventory_agent import inventory_node
from .logistics_agent import logistics_node

_graph = StateGraph(AgentState)
_graph.add_node("demand",    demand_node)
_graph.add_node("inventory", inventory_node)
_graph.add_node("logistics", logistics_node)

_graph.set_entry_point("demand")
_graph.add_edge("demand",    "inventory")
_graph.add_edge("inventory", "logistics")
_graph.add_edge("logistics", END)

agent_graph = _graph.compile()
