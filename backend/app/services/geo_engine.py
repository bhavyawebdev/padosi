"""Shared geo engine — the ONLY place distance/radius logic lives.

All three features (feed, directory, request board) use these helpers, so
radius semantics are consistent. Queries use PostGIS geography functions
(ST_DWithin / ST_Distance) — never manual lat/lng math in Python.

Columns are stored as `geography(Point,4326)`, which makes ST_DWithin take
metres directly and distances come back in metres.
"""
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import func
from sqlalchemy.sql.elements import ColumnElement

GEOGRAPHY_POINT = Geography(geometry_type="POINT", srid=4326)


def origin_geography(lat: float, lng: float) -> ColumnElement:
    """Build the viewer's location as a geography point (lng, lat order!)."""
    return func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326).cast(GEOGRAPHY_POINT)


def within_radius_expression(column: Any, lat: float, lng: float, radius_m: float) -> ColumnElement:
    """Boolean: is `column` within `radius_m` metres of (lat, lng)?"""
    return func.ST_DWithin(column, origin_geography(lat, lng), radius_m)


def distance_expression(column: Any, lat: float, lng: float):
    """Distance in metres from (lat, lng) — label as `distance_m`."""
    return func.ST_Distance(column, origin_geography(lat, lng)).label("distance_m")
