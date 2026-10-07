"""Takeoff from gated lengths only. Ungated lengths are not bid quantities."""
import math

def takeoff(area_sqft, waste, edges):
    gated = [e for e in edges if e.get("origin") == "MEASURED"]
    def total(kind):
        return sum(e["length_ft"] for e in gated if e["class"] == kind)
    order_sq = area_sqft * (1 + waste) / 100.0
    return {
        "order_squares": round(order_sq, 2),
        "field_bundles": int(math.ceil(order_sq * 3)),
        "starter_ft": round(total("eave"), 1),
        "drip_ft": round(total("eave") + total("rake"), 1),
        "ridge_ft": round(total("ridge"), 1),
        "hip_ft": round(total("hip"), 1),
        "valley_ft": round(total("valley"), 1),
        "underlayment_rolls": int(math.ceil(order_sq / 4)),
        "bid_uses_ungated_lengths": False,
    }
