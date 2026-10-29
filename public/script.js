// DOM Elements
const itemForm = document.getElementById('item-form');
const itemIdInput = document.getElementById('item-id');
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
const submitBtn = document.getElementById('submit-btn');
const submitText = document.getElementById('submit-text');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const itemsTbody = document.getElementById('items-tbody');

const statTotalItems = document.getElementById('stat-total-items');
const statTotalValue = document.getElementById('stat-total-value');
const tableCountBadge = document.getElementById('table-count-badge');
const toastContainer = document.getElementById('toast-container');

// State
let isEditing = false;

// 1. Toast Notification Helper
function showToast(message, type = 'success') {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.25s ease-in forwards';
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 2600);
}

// 2. Update Stats Counter
function updateStats(items) {
  const count = items.length;
  const totalVal = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  if (statTotalItems) statTotalItems.textContent = count;
  if (tableCountBadge) tableCountBadge.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  if (statTotalValue) {
    statTotalValue.textContent = '₹' + totalVal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

// 3. READ: Fetch items from GET /items
async function fetchItems() {
  try {
    const response = await fetch('/items');
    if (!response.ok) {
      throw new Error(`Failed to fetch items (${response.status})`);
    }
    const items = await response.json();
    renderTable(items);
    updateStats(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    itemsTbody.innerHTML = `<tr><td colspan="4" class="empty-state">Unable to connect to server. Please check the backend.</td></tr>`;
  }
}

// 4. Render Table with continuous Serial Numbers
function renderTable(items) {
  itemsTbody.innerHTML = '';

  if (!items || items.length === 0) {
    itemsTbody.innerHTML = `<tr><td colspan="4" class="empty-state">No items in inventory. Add your first item above!</td></tr>`;
    return;
  }

  items.forEach((item, index) => {
    const serialNo = index + 1; // Continuous Sequential Serial No. (1, 2, 3...)
    const row = document.createElement('tr');

    row.innerHTML = `
      <td><span class="serial-pill">${serialNo}</span></td>
      <td class="item-name-cell">${escapeHtml(item.name)}</td>
      <td><span class="price-pill">₹${Number(item.price).toLocaleString('en-IN')}</span></td>
      <td style="text-align: center;">
        <div class="action-group">
          <button class="btn-action btn-edit" onclick="handleEdit(${item.id}, '${escapeQuotes(item.name)}', ${item.price})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <button class="btn-action btn-delete" onclick="handleDelete(${item.id}, '${escapeQuotes(item.name)}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </td>
    `;

    itemsTbody.appendChild(row);
  });
}

// 5. CREATE or UPDATE on form submit
itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = itemNameInput.value.trim();
  const price = parseFloat(itemPriceInput.value);

  if (!name || isNaN(price) || price < 0) {
    showToast('Please enter a valid item name and non-negative price.', 'danger');
    return;
  }

  try {
    if (isEditing) {
      // UPDATE: PUT /items/:id
      const id = itemIdInput.value;
      const response = await fetch(`/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update item.');
      }

      showToast(`"${name}" updated successfully!`, 'success');
    } else {
      // CREATE: POST /items
      const response = await fetch('/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create item.');
      }

      showToast(`"${name}" added to inventory!`, 'success');
    }

    resetForm();
    await fetchItems();
  } catch (error) {
    console.error('Submission error:', error);
    showToast(error.message, 'danger');
  }
});

// 6. EDIT: Populate form
window.handleEdit = function(id, name, price) {
  isEditing = true;
  itemIdInput.value = id;
  itemNameInput.value = name;
  itemPriceInput.value = price;

  if (submitText) submitText.textContent = 'Update Item';
  if (formTitle) formTitle.textContent = 'Edit Item Details';
  if (formSubtitle) formSubtitle.textContent = 'Modify item information and click update';

  cancelBtn.style.display = 'inline-flex';
  itemNameInput.focus();
};

// 7. DELETE: Send DELETE /items/:id
window.handleDelete = async function(id, name) {
  const confirmed = confirm(`Are you sure you want to delete "${name}" from inventory?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`/items/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete item.');
    }

    if (isEditing && itemIdInput.value == id) {
      resetForm();
    }

    showToast(`"${name}" deleted from inventory.`, 'success');
    await fetchItems();
  } catch (error) {
    console.error('Delete error:', error);
    showToast(error.message, 'danger');
  }
};

// 8. Cancel Edit
cancelBtn.addEventListener('click', () => {
  resetForm();
});

// 9. Reset Form
function resetForm() {
  itemForm.reset();
  itemIdInput.value = '';
  isEditing = false;
  if (submitText) submitText.textContent = 'Add Item';
  if (formTitle) formTitle.textContent = 'Add New Item';
  if (formSubtitle) formSubtitle.textContent = 'Enter the item details below to add it to the inventory';
  cancelBtn.style.display = 'none';
}

// Helpers
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeQuotes(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Initial fetch
document.addEventListener('DOMContentLoaded', fetchItems);
