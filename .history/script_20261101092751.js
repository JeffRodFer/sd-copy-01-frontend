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
          <ul style="list-style: none; padding: 0; display: flex; border-radius: 2px color:#7b401f; flex-direction: column; gap: 8px;">
            ${itensCat.map(x => `
              <li style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e19b56;">
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
   RENDERIZAR OPÇÕES DE MARMITA (PASSO 2)
   ========================================================= */
function renderMarmitas() {
  const container = document.getElementById('marmitas');
  if (!container || !menu) return;

  const grupos = [
    { titulo: 'Guarnições', categoriasBd: ['Guarnições'], inputName: 'guarnicoes' },
    { titulo: 'Proteínas', categoriasBd: ['Proteínas'], inputName: 'proteinas' },
    { titulo: 'Bebidas', categoriasBd: ['Gaseificadas', 'Sucos Naturais 300ml', 'Polpas 500ml'], inputName: 'bebidas' },
    { titulo: 'Sobremesas', categoriasBd: ['Sobremesas'], inputName: 'sobremesas' }
  ];

  let html = '';

  grupos.forEach(grupo => {
    const itensCat = menu
      .filter(item => {
        const cat = (item.categoria || '').trim();
        return grupo.categoriasBd.includes(cat) && item.disponivel;
      })
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

    if (itensCat.length > 0) {
      // Apenas Bebidas e Sobremesas exibem preço
      const mostrarPreco = grupo.titulo === 'Bebidas' || grupo.titulo === 'Sobremesas';

      html += `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #7b401f; border-bottom: 2px solid #e0d6cc; padding-bottom: 6px; margin-bottom: 12px; font-size: 1.1rem;">${grupo.titulo}</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${itensCat.map(x => `
              <label style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 12px 14px; border-radius: 6px; border: 1px solid #e19b56; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <input type="checkbox" name="item_${grupo.inputName}" value="${x.id}" style="transform: scale(1.3); accent-color: #7b401f;">
                  <span style="color: #333; font-weight: 500;">${x.nome}</span>
                </div>
                <span style="font-weight: bold; color: #7b401f;">
                  ${mostrarPreco && x.preco > 0 ? 'R$ ' + Number(x.preco).toFixed(2).replace('.', ',') : ''}
                </span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    }
  });

  // Adiciona o campo de observações
  html += `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #7b401f; border-bottom: 2px solid #e0d6cc; padding-bottom: 6px; margin-bottom: 12px; font-size: 1.1rem;">Observações</h3>
      <textarea id="obsMarmita" rows="3" style="width: 100%; padding: 10px; border: 1px solid #e19b56; border-radius: 6px; resize: vertical;" placeholder="Ex: Sem cebola, carne bem passada..."></textarea>
    </div>
  `;

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

    // Chama a função para desenhar os checkboxes ANTES de abrir a janela
    renderMarmitas();
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
   GERADORES DE CÓDIGO (PEDIDO E VERIFICAÇÃO)
   ========================================================= */
function gerarCodigoPedido() {
  const agora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}${pad(agora.getHours())}${pad(agora.getMinutes())}${pad(agora.getSeconds())}`;
  const hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
  return `RI-${timestamp}-${hex}`;
}

function gerarCodigoVerificacao() {
  let result = '';
  const characters = '0123456789ABCDEF';
  for (let i = 0; i < 12; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
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

  // 1. Cabeçalho do Cliente
  let mensagem = `*${orderState.nome}*\n`;
  mensagem += `${orderState.telefone.replace(/\D/g, '')}\n`; // Remove pontuações para ficar igual à foto

  if (orderState.endereco) {
    mensagem += `${orderState.endereco}\n`;
  }

  if (orderState.entrega) {
    mensagem += `Entrega: (X)\nRetira: ( )\n\n`;
  } else {
    mensagem += `Entrega: ( )\nRetira: (X)\n\n`;
  }

  // Lê o que foi marcado nos checkboxes
  const getChecked = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
    .map(el => menu.find(i => String(i.id) === String(el.value)))
    .filter(Boolean);

  const selGuarnicoes = getChecked('item_guarnicoes');
  const selProteinas = getChecked('item_proteinas');
  const selBebidas = getChecked('item_bebidas');
  const selSobremesas = getChecked('item_sobremesas');
  const obs = $('obsMarmita') ? $('obsMarmita').value.trim() : '';

  // 2. Itens do Pedido
  let subtotalMarmita = basePrice;
  totalGeral += basePrice;

  mensagem += `*Pedido 01:*\n`;

  // Proteínas com "01" na frente
  if (selProteinas.length > 0) {
    selProteinas.forEach(p => {
      mensagem += `01 ${p.nome}\n`;
    });
  }

  // Guarnições diretas
  if (selGuarnicoes.length > 0) {
    selGuarnicoes.forEach(g => {
      mensagem += `${g.nome}\n`;
    });
  }

  // Preço base da marmita
  mensagem += `${money(basePrice)}\n`;

  // Bebidas (adiciona "01" e o preço)
  if (selBebidas.length > 0) {
    selBebidas.forEach(b => {
      subtotalMarmita += Number(b.preco);
      totalGeral += Number(b.preco);
      mensagem += `01 ${b.nome} ${money(b.preco)}\n`;
    });
  }

  // Sobremesas (adiciona "01" e o preço)
  if (selSobremesas.length > 0) {
    selSobremesas.forEach(s => {
      subtotalMarmita += Number(s.preco);
      totalGeral += Number(s.preco);
      mensagem += `01 ${s.nome} ${money(s.preco)}\n`;
    });
  }

  if (obs) {
    mensagem += `Obs: ${obs}\n`;
  }

  // 3. Totais e Fechamento
  mensagem += `---------------------------------------------------------------------------------\n`;
  mensagem += `Marmita 01 = ${money(subtotalMarmita)}\n`;

  if (orderState.entrega) {
    totalGeral += deliveryPrice;
    mensagem += `Taxa de Entrega = ${money(deliveryPrice)}\n`;
  }

  mensagem += `*Total final ${money(totalGeral)}*\n`;

  // Códigos automáticos (Data/Hora e Hexadecimal aleatório)
  mensagem += `Pedido: ${gerarCodigoPedido()}\n`;
  mensagem += `Verificação: ${gerarCodigoVerificacao()}\n\n`;

  mensagem += `💳 *Pagamento via PIX:*\n`;
  mensagem += `Chave: 30571173845\n`;
  mensagem += `(Por favor, envie o comprovante por aqui!)`;

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