"""Gate model representing airport terminal gates."""
import enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.terminal import Terminal
    from app.models.assignment import GateAssignment
    from app.models.conflict import Conflict


class GateCapability(str, enum.Enum):
    """Gate domestic/international capability."""
    DOMESTIC = "DOMESTIC"
    INTERNATIONAL = "INTERNATIONAL"
    BOTH = "BOTH"


class Gate(Base, TimestampMixin):
    """Gate entity where aircraft dock for passenger boarding and deplaning."""
    __tablename__ = "gates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    terminal_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("terminals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    gate_code: Mapped[str] = mapped_column(String(20), nullable=False)
    gate_type: Mapped[str] = mapped_column(String(50), default="JET_BRIDGE", nullable=False)
    capability: Mapped[GateCapability] = mapped_column(
        Enum(GateCapability, name="gate_capability_enum"),
        default=GateCapability.BOTH,
        nullable=False,
    )
    supported_aircraft_types: Mapped[str] = mapped_column(
        String(255),
        default="REGIONAL,NARROW_BODY,WIDE_BODY",
        nullable=False,
    )
    max_aircraft_size: Mapped[str] = mapped_column(
        String(50),
        default="WIDE_BODY",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    closure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    terminal: Mapped["Terminal"] = relationship("Terminal", back_populates="gates")
    assignments: Mapped[List["GateAssignment"]] = relationship(
        "GateAssignment",
        back_populates="gate",
        cascade="all, delete-orphan",
    )
    conflicts: Mapped[List["Conflict"]] = relationship(
        "Conflict",
        back_populates="gate",
    )

    __table_args__ = (
        UniqueConstraint("terminal_id", "gate_code", name="uq_gate_terminal_code"),
    )

    def __repr__(self) -> str:
        return f"<Gate(id={self.id}, code='{self.gate_code}', capability='{self.capability}')>"
