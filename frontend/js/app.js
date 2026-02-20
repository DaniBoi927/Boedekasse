const API = window.API_BASE || '/api';

async function loadTransactions() {
  try {
    const res = await fetch(`${API}/transactions`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    renderTransactions(data);
    updateBalance(data);
  } catch (err) {
    document.getElementById('txList').innerHTML =
      `<li style="color:#e53e3e">Failed to load transactions: ${escapeHtml(err.message)}</li>`;
  }
}

function renderTransactions(transactions) {
  const list = document.getElementById('txList');
  list.innerHTML = '';
  transactions.forEach((tx) => {
    const li = document.createElement('li');
    li.className = tx.type;
    li.innerHTML = `
      <span class="tx-desc">${escapeHtml(tx.description)}</span>
      <span class="tx-amount ${tx.type}">${tx.type === 'expense' ? '-' : '+'}€${parseFloat(tx.amount).toFixed(2)}</span>
      <button class="tx-delete" data-id="${tx.id}" title="Delete">✕</button>
    `;
    li.querySelector('.tx-delete').addEventListener('click', () => deleteTransaction(tx.id));
    list.appendChild(li);
  });
}

function updateBalance(transactions) {
  const balance = transactions.reduce((sum, tx) => {
    return tx.type === 'income'
      ? sum + parseFloat(tx.amount)
      : sum - parseFloat(tx.amount);
  }, 0);
  const el = document.getElementById('balance');
  el.textContent = `€ ${balance.toFixed(2)}`;
  el.style.color = balance >= 0 ? '#38a169' : '#e53e3e';
}

document.getElementById('txForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const description = document.getElementById('description').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;

  const res = await fetch(`${API}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, amount, type }),
  });

  if (res.ok) {
    e.target.reset();
    loadTransactions();
  }
});

async function deleteTransaction(id) {
  const res = await fetch(`${API}/transactions/${id}`, { method: 'DELETE' });
  if (res.ok) loadTransactions();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

loadTransactions();
