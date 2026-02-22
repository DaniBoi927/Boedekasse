async function load() {
  try {
    const res = await fetch('/api/fines');
    const data = await res.json();
    const tbody = document.querySelector('#finesTable tbody');
    tbody.innerHTML = '';
    (data || []).forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(f.payer)}</td>
        <td>${(Number(f.amount)||0).toFixed(2)} kr</td>
        <td>${escapeHtml(f.reason || '')}</td>
        <td>${f.paid ? 'Yes' : 'No'}</td>
        <td>${!f.paid ? '<button class="pay">Mark paid</button>' : ''}</td>
      `;
      if (!f.paid) {
        tr.querySelector('.pay').addEventListener('click', async () => {
          const who = prompt('Who paid?') || '';
          if (!who) return;
          await fetch(`/api/fines/${f.id}/pay`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ paid_by: who })});
          load();
        });
      }
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed load', err);
    alert('Failed to load fines');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]);
}

document.getElementById('addForm').addEventListener('submit', async e => {
  e.preventDefault();
  const payer = document.getElementById('payer').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const reason = document.getElementById('reason').value.trim();
  if (!payer || isNaN(amount) || amount <= 0) return alert('Invalid input');
  try {
    await fetch('/api/fines', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ payer, amount, reason })});
    document.getElementById('payer').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('reason').value = '';
    load();
  } catch (err) {
    console.error('Failed add', err);
    alert('Failed to add fine');
  }
});

load();
