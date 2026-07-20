import Decimal from 'decimal.js';
import { D, ZERO } from './money';

export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'FEE';

export interface InvestmentTransaction {
  id: string;
  type: TransactionType;
  executedAt: string;
  quantity: string;
  unitPrice: string;
  fee: string;
  currency: string;
  fxRateToPln: string;
}

interface FifoLot {
  quantity: Decimal;
  unitCostPln: Decimal;
}

export interface EtfResult {
  quantity: string;
  purchasesAndFeesPln: string;
  saleProceedsPln: string;
  dividendsPln: string;
  marketValuePln: string;
  remainingCostBasisPln: string;
  realizedProfitPln: string;
  unrealizedProfitPln: string;
  totalProfitPln: string;
  returnPercent: string;
}

/** FIFO: fees on BUY increase unit cost; fees on SELL reduce proceeds. */
export function calculateEtf(
  transactions: InvestmentTransaction[],
  quotePrice: string,
  quoteFxToPln: string,
): EtfResult {
  const sorted = [...transactions].sort(
    (a, b) => a.executedAt.localeCompare(b.executedAt) || a.id.localeCompare(b.id),
  );
  const lots: FifoLot[] = [];
  let quantity = ZERO;
  let purchasesAndFees = ZERO;
  let saleProceeds = ZERO;
  let dividends = ZERO;
  let realized = ZERO;

  for (const tx of sorted) {
    const qty = D(tx.quantity);
    const price = D(tx.unitPrice);
    const feePln = D(tx.fee).mul(tx.fxRateToPln);
    const grossPln = qty.mul(price).mul(tx.fxRateToPln);
    if (tx.type === 'BUY') {
      if (qty.lte(0)) throw new Error('Ilość zakupu musi być dodatnia');
      const totalCost = grossPln.add(feePln);
      lots.push({ quantity: qty, unitCostPln: totalCost.div(qty) });
      quantity = quantity.add(qty);
      purchasesAndFees = purchasesAndFees.add(totalCost);
    } else if (tx.type === 'SELL') {
      if (qty.lte(0) || qty.gt(quantity)) throw new Error('Sprzedaż przekracza posiadaną ilość');
      let left = qty;
      let soldCost = ZERO;
      while (left.gt(0)) {
        const lot = lots[0];
        if (!lot) throw new Error('Brak partii FIFO');
        const used = Decimal.min(left, lot.quantity);
        soldCost = soldCost.add(used.mul(lot.unitCostPln));
        lot.quantity = lot.quantity.sub(used);
        left = left.sub(used);
        if (lot.quantity.eq(0)) lots.shift();
      }
      const net = grossPln.sub(feePln);
      saleProceeds = saleProceeds.add(net);
      realized = realized.add(net.sub(soldCost));
      quantity = quantity.sub(qty);
    } else if (tx.type === 'DIVIDEND') {
      dividends = dividends.add(D(tx.unitPrice).mul(tx.fxRateToPln).sub(feePln));
    } else {
      realized = realized.sub(feePln.add(grossPln));
    }
  }

  const remainingCost = lots.reduce((sum, lot) => sum.add(lot.quantity.mul(lot.unitCostPln)), ZERO);
  const marketValue = quantity.mul(quotePrice).mul(quoteFxToPln);
  const unrealized = marketValue.sub(remainingCost);
  const total = realized.add(unrealized).add(dividends);
  const returnPercent = purchasesAndFees.eq(0) ? ZERO : total.div(purchasesAndFees).mul(100);
  return {
    quantity: quantity.toString(),
    purchasesAndFeesPln: purchasesAndFees.toString(),
    saleProceedsPln: saleProceeds.toString(),
    dividendsPln: dividends.toString(),
    marketValuePln: marketValue.toString(),
    remainingCostBasisPln: remainingCost.toString(),
    realizedProfitPln: realized.toString(),
    unrealizedProfitPln: unrealized.toString(),
    totalProfitPln: total.toString(),
    returnPercent: returnPercent.toString(),
  };
}
