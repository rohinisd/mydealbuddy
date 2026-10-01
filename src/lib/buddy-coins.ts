// No "server-only" import -- this constant is needed in the client checkout
// summary as well as server-side order/redemption logic.
// 1000 coins = $10 redeemable, i.e. 1 coin = $0.01. See BUDDY_COINS_RATE in
// cj-products.ts for the (separate) earn rate.
export const COIN_REDEMPTION_RATE = 0.01;
