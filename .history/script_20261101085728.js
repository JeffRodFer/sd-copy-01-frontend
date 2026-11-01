/* =========================================================
   CONFIGURAÇÕES E ESTADO GLOBAL
   ========================================================= */
const BACKEND_URL = 'https://sd-copy-01-backend.vercel.app';
let basePrice = 20;
let deliveryPrice = 5;
let calculatedOrder = null;

let orderState = {
  nome: '',
  telefone: '',
  endereco: '',
  entrega: true,
  marmitas: []
};

// Atalho para getElementById
const $ = (id) => document.getElementById(id);

// Formatação de moeda
function money(val) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Escapar HTML para segurança
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================
   RELÓGIO DA TOPBAR
   ========================================================= */
function updateClock() {
  const dt = $('datetime');
  if (dt) {
    const now = new Date();
    dt.textContent = now.toLocaleString('pt-BR');
  }
}
setInterval(updateClock, 1000);
updateClock();

/* =========================================================
   GERENCIAMENTO DE PASSOS (STEPS)
   ========================================================= */
function setStep(stepNumber) {
  document.querySelectorAll('.step').forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
  });

  const target = $(`orderStep${stepNumber}`) || $(`step-${stepNumber}`);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }
}

/* =========================================================
   CARREGAR CARDÁPIO E RENDERIZAR NA HOME
   ========================================================= */
async function loadMenu() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cardapio`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('Erro ao carregar cardápio');
    }

    const data = await response.json();
    console.log("Cardápio recebido do backend:", data);

    let rawMenu = Array.isArray(data) ? data : (data.itens || data.items || []);

    menu = rawMenu.map((item, index) => ({
      ...item,
      id: item.id ? item.id : `produto-ref-${index}`,
      disponivel: item.disponivel !== false
    }));

    basePrice = Number(data.basePrice) || 20;
    deliveryPrice = Number(data.deliveryPrice) || 5;

    // Renderiza o cardápio na página principal (<main id="menu">)
    renderizarCardapioPrincipal();

  } catch (err) {
    console.warn('Não foi possível carregar o cardápio:', err);
    menu = [];
  }
}

loadMenu();

function renderizarCardapioPrincipal() {
  const container = document.getElementById('menu');
  if (!container || !menu) return;

  const grupos = [
    { titulo: 'Guarnições', categoriasBd: ['Guarnições'] },
    { titulo: 'Proteínas', categoriasBd: ['Proteínas'] },
    { titulo: 'Bebidas', categoriasBd: ['Gaseificadas', 'Sucos Naturais 300ml', 'Polpas 500ml'] },
    { titulo: 'Sobremesas', categoriasBd: ['Sobremesas'] }
  ];

  let html = '';

  grupos.forEach(grupo => {
    const itensCat = menu
      .filter(item => {
        const categoriaLimpa = (item.categoria || '').trim();
        return grupo.categoriasBd.includes(categoriaLimpa) && item.disponivel;
      })
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

    if (itensCat.length > 0) {
      // Regra de negócio: Só mostra preço para Bebidas e Sobremesas
      const mostrarPreco = grupo.titulo === 'Bebidas' || grupo.titulo === 'Sobremesas';

      html += `
        <div class="home-categoria-group" style="margin-bottom: 25px;">
          <h3 style="color: #7b401f; border-bottom: 2px solid #e0d6cc; padding-bottom: 6px; margin-bottom: 12px; font-size: 1.2rem;">${grupo.titulo}</h3>
          <ul style="list-style: none; padding: 0; display: flex; border-radius flex-direction: column; gap: 8px;">
            ${itensCat.map(x => `
              <li style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e0d6cc;">
                <span style="color: #333; font-weight: 500;">${x.nome}</span>
                <span style="font-weight: bold; color: #7b401f;">${mostrarPreco && x.preco > 0 ? 'R$ ' + Number(x.preco).toFixed(2).replace('.', ',') : ''}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}



/* =========================================================
   MÁSCARA DE TELEFONE
   ========================================================= */
function maskPhone(v) {
  v = v.replace(/\D/g, "");
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  return v;
}

if ($('customerPhone')) {
  $('customerPhone').addEventListener('input', e => {
    e.target.value = maskPhone(e.target.value);
  });
}

/* =========================================================
   CONTROLES DE MODAIS E FLUXO DE PEDIDO
   ========================================================= */
if ($('openOrder')) {
  $('openOrder').addEventListener('click', () => {
    if ($('orderOverlay')) $('orderOverlay').classList.remove('hidden');
    setStep(1);

    // Garante pelo menos 1 marmita inicial se o array estiver vazio
    if (!orderState.marmitas || orderState.marmitas.length === 0) {
      orderState.marmitas = [{ guarnicoes: [], proteinas: [], observacao: '' }];
    }
  });
}

if ($('closeOrder1') || $('cancelFinal')) {
  const closeModals = () => {
    if ($('orderOverlay')) $('orderOverlay').classList.add('hidden');
  };
  if ($('closeOrder1')) $('closeOrder1').addEventListener('click', closeModals);
  if ($('cancelFinal')) $('cancelFinal').addEventListener('click', closeModals);
}

// Botão Continuar (Passo 1 -> Passo 2)
if ($('toStep2')) {
  $('toStep2').addEventListener('click', (e) => {
    e.preventDefault();
    const name = $('customerName')?.value.trim();
    const phone = $('customerPhone')?.value.trim();

    if (!name || !phone) {
      alert('Por favor, preencha o Nome e o Telefone.');
      return;
    }

    setStep(2);
  });
}

// Botão Voltar (Passo 2 -> Passo 1)
if ($('backStep1')) {
  $('backStep1').addEventListener('click', (e) => {
    e.preventDefault();
    setStep(1);
  });
}

/* =========================================================
   CÁLCULO DO PEDIDO
   ========================================================= */
async function calculateOrder() {
  orderState.nome = $('customerName') ? $('customerName').value.trim() : '';
  orderState.telefone = $('customerPhone') ? $('customerPhone').value.trim() : '';
  orderState.endereco = $('customerAddress') ? $('customerAddress').value.trim() : '';

  const deliveryRadio = document.querySelector('input[name="delivery"]:checked');
  orderState.entrega = deliveryRadio ? deliveryRadio.value === 'true' : true;

  if (!orderState.nome || !orderState.telefone) {
    alert('Por favor, preencha o seu Nome e Telefone.');
    return false;
  }

  let totalGeral = 0;
  let mensagem = `*Pedido - Cardápio Digital*\n\n*Cliente:* ${orderState.nome}\n*Telefone:* ${orderState.telefone}\n*Endereço:* ${orderState.endereco || 'Retirada no local'}\n\n`;

  if (orderState.marmitas && orderState.marmitas.length > 0) {
    orderState.marmitas.forEach((m, idx) => {
      totalGeral += basePrice;
      mensagem += `*Marmita ${idx + 1}* (${money(basePrice)})\n`;

      if (m.guarnicoes && m.guarnicoes.length > 0) {
        mensagem += `  - Guarnições: ${m.guarnicoes.map(id => {
          const item = menu.find(i => String(i.id) === String(id));
          return item ? item.nome : id;
        }).join(', ')}\n`;
      }

      if (m.proteínas && m.proteínas.length > 0) {
        mensagem += `  - Proteínas: ${m.proteínas.map(id => {
          const item = menu.find(i => String(i.id) === String(id));
          return item ? item.nome : id;
        }).join(', ')}\n`;
      }

      if (m.observacao) {
        mensagem += `  - Obs: ${m.observacao}\n`;
      }
      mensagem += '\n';
    });
  }

  if (orderState.entrega) {
    totalGeral += deliveryPrice;
    mensagem += `*Taxa de Entrega:* ${money(deliveryPrice)}\n`;
  } else {
    mensagem += `*Retirada no Restaurante*\n`;
  }

  mensagem += `\n*Total Final:* ${money(totalGeral)}`;
  mensagem += `\n\n*Pagamento via PIX:*\nCHAVE AO CONCLUIR O PEDIDO`;

  calculatedOrder = {
    mensagem: mensagem,
    total: totalGeral
  };

  return true;
}

/* =========================================================
   PASSO 2 -> PASSO 3 (EVENTO DO BOTÃO SEGURO)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const btnStep3 = document.getElementById('toStep3') || $('toStep3');

  if (btnStep3) {
    btnStep3.removeAttribute('onclick');

    btnStep3.addEventListener('click', async (event) => {
      event.preventDefault();
      console.log('TESTE 1: Clicou em Encerrar e seguir');

      let ok = true;
      if (typeof calculateOrder === 'function') {
        try {
          ok = await calculateOrder();
        } catch (e) {
          console.warn("Aviso no calculateOrder:", e);
          ok = true;
        }
      }

      if (!ok) return;

      const summaryEl = document.getElementById('orderSummary') || document.getElementById('orderSummaryText');
      if (summaryEl && calculatedOrder) {
        summaryEl.textContent = calculatedOrder.mensagem || '';
      }

      const totalEl = document.getElementById('finalTotal');
      if (totalEl && calculatedOrder) {
        totalEl.textContent = `Total: ${money(calculatedOrder.total || 0)}`;
      }

      setStep(3);
      console.log('TESTE 4: Entrou no Passo 3 com sucesso!');
    });
  }
});

/* =========================================================
   BOTÃO DE ENVIAR AO WHATSAPP (PASSO 3)
   ========================================================= */
if ($('sendRestaurant')) {
  $('sendRestaurant').addEventListener('click', (e) => {
    e.preventDefault();
    if (!calculatedOrder || !calculatedOrder.mensagem) {
      alert('Nenhum pedido calculado para enviar.');
      return;
    }

    const phoneRestaurante = '5581920036280'; // Número do restaurante
    const url = `https://wa.me/${phoneRestaurante}?text=${encodeURIComponent(calculatedOrder.mensagem)}`;
    window.open(url, '_blank');
  });
}