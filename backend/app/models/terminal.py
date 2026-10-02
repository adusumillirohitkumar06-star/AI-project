"""Terminal model representing airport passenger terminals."""
from typing import TYPE_CHECKING, List
from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.airport import Airport
    from app.models.gate import Gate


class Terminal(Base, TimestampMixin):
    """Terminal entity belonging to an airport and containing gates."""
    __tablename__ = "terminals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    airport_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("airports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    terminal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    airport: Mapped["Airport"] = relationship("Airport", back_populates="terminals")
    gates: Mapped[List["Gate"]] = relationship(
        "Gate",
        back_populates="terminal",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("airport_id", "terminal_code", name="uq_terminal_airport_code"),
    )

    def __repr__(self) -> str:
        return f"<Terminal(id={self.id}, code='{self.terminal_code}', airport_id={self.airport_id})>"
