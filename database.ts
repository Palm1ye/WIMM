import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseAsync('expenses.db');

// Tablo oluşturma fonksiyonu
export const createTables = async () => {
  try {
    const statement = (await db).prepareAsync(
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL,
        description TEXT
      )`
    );
    await (await statement).executeAsync();
    await (await statement).finalizeAsync();
    console.log('Table created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
};

// Gider ekleme fonksiyonu
export const addExpense = async (amount: number, description: string) => {
  try {
    const statement = await (await db).prepareAsync(
      'INSERT INTO expenses (amount, description) VALUES ($amount, $description)'
    );
    const result = await statement.executeAsync({ $amount: amount, $description: description });
    await statement.finalizeAsync();
    console.log('Expense added successfully', result.lastInsertRowId, result.changes);
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

// Girilen giderleri getirme fonksiyonu
export const getExpenses = async (): Promise<{ id: number; amount: number; description: string; category: string }[]> => {
  try {
    const statement = await (await db).prepareAsync('SELECT * FROM expenses');
    const result = await statement.executeAsync();
    const expenses = await result.getAllAsync() as { id: number; amount: number; description: string; category: string }[];
    await statement.finalizeAsync();
    return expenses;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
};

// Gider silme fonksiyonu
export const deleteExpense = async (id: number) => {
  try {
    const statement = await (await db).prepareAsync(
      'DELETE FROM expenses WHERE id = $id'
    );
    const result = await statement.executeAsync({ $id: id });
    await statement.finalizeAsync();
    console.log('Expense deleted successfully', result.changes);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};