import { useCurrency as useCurrencyContext } from '../context/CurrencyContext';

export function useCurrency() {
  return useCurrencyContext();
}
