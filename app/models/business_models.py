from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, index=True, nullable=False)
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    launch_date = Column(Date, nullable=False)

    sales = relationship("SalesDaily", back_populates="product")
    inventory = relationship("Inventory", back_populates="product")


class Marketplace(Base):
    __tablename__ = "marketplaces"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    sales = relationship("SalesDaily", back_populates="marketplace")


class SalesDaily(Base):
    __tablename__ = "sales_daily"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=False, index=True)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    visits = Column(Integer, default=0)
    orders = Column(Integer, default=0)
    units_sold = Column(Integer, default=0)
    revenue = Column(Float, default=0)
    returns = Column(Integer, default=0)
    ad_spend = Column(Float, default=0)

    product = relationship("Product", back_populates="sales")
    marketplace = relationship("Marketplace", back_populates="sales")

    __table_args__ = (Index("ix_sales_date_product_mkt", "date", "product_id", "marketplace_id"),)


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=False, index=True)
    stock = Column(Integer, default=0)
    incoming_stock = Column(Integer, default=0)

    product = relationship("Product", back_populates="inventory")


class CompetitorPrice(Base):
    __tablename__ = "competitor_prices"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=False, index=True)
    our_price = Column(Float, nullable=False)
    competitor_avg_price = Column(Float, nullable=False)
    competitor_min_price = Column(Float, nullable=False)