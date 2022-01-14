export class BankAccount {
  private _balance = 0;

  deposit(amount: number) {
    if (amount <= 0) throw new Error('amount must be > 0');
    this._balance += amount;
  }
  withdraw(amount: number) {
    if (amount <= 0) throw new Error('amount must be > 0');
    this._balance -= amount;
  }

  public get balance(): number {
    return this._balance;
  }
}
