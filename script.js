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
   GERENCIAMENTO DE MÚLTIPLAS MARMITAS E RENDERIZAÇÃO
   ========================================================= */
window.adicionarMarmita = function () {
  salvarEstadoMarmitas(); // Salva o que já foi preenchido
  orderState.marmitas.push({ guarnicoes: [], proteinas: [], bebidas: [], sobremesas: [], observacao: '' });
  renderMarmitas(); // Desenha a tela novamente com a nova marmita
};

window.removerMarmita = function (index) {
  salvarEstadoMarmitas();
  orderState.marmitas.splice(index, 1);
  renderMarmitas();
};

function salvarEstadoMarmitas() {
  if (!orderState.marmitas) return;
  orderState.marmitas.forEach((m, i) => {
    const getVals = (name) => Array.from(document.querySelectorAll(`input[name="${name}_${i}"]:checked`)).map(el => el.value);
    m.guarnicoes = getVals('item_guarnicoes');
    m.proteinas = getVals('item_proteinas');
    m.bebidas = getVals('item_bebidas');
    m.sobremesas = getVals('item_sobremesas');

    const obsEl = document.getElementById(`obsMarmita_${i}`);
    m.observacao = obsEl ? obsEl.value.trim() : '';
  });
}

/* =========================================================
   GERENCIAMENTO DE MÚLTIPLAS MARMITAS E RENDERIZAÇÃO
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

  orderState.marmitas.forEach((marmita, index) => {
    const num = String(index + 1).padStart(2, '0');

    html += `
      <div style="border: 2px solid #e19b56; border-radius: 8px; padding: 15px; margin-bottom: 25px; background: #fffdf9;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h2 style="color: #7b401f; margin: 0; font-size: 1.4rem;">Marmita ${num}</h2>
          ${index > 0 ? `<button type="button" onclick="removerMarmita(${index})" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer;">Remover</button>` : ''}
        </div>
    `;

    grupos.forEach(grupo => {
      const itensCat = menu
        .filter(item => {
          const cat = (item.categoria || '').trim();
          return grupo.categoriasBd.includes(cat) && item.disponivel;
        })
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));

      if (itensCat.length > 0) {
        const mostrarPreco = grupo.titulo === 'Bebidas' || grupo.titulo === 'Sobremesas';

        // Gera os checkboxes dos itens
        const itensHtml = itensCat.map(x => {
          const isChecked = marmita[grupo.inputName] && marmita[grupo.inputName].includes(String(x.id)) ? 'checked' : '';
          return `
          <label style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 12px 14px; border-radius: 6px; border: 1px solid #e0d6cc; cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" name="item_${grupo.inputName}_${index}" value="${x.id}" ${isChecked} style="transform: scale(1.3); accent-color: #7b401f;">
              <span style="color: #333; font-weight: 500;">${x.nome}</span>
            </div>
            <span style="font-weight: bold; color: #7b401f;">
              ${mostrarPreco && x.preco > 0 ? 'R$ ' + Number(x.preco).toFixed(2).replace('.', ',') : ''}
            </span>
          </label>
        `}).join('');

        // Se for Bebida ou Sobremesa, coloca dentro de um bloco retrátil (<details>)
        if (mostrarPreco) {
          html += `
            <details style="margin-bottom: 20px; background: #faf4ed; border: 1px solid #e19b56; border-radius: 6px; padding: 12px;">
              <summary style="color: #7b401f; font-size: 1.1rem; font-weight: bold; cursor: pointer; outline: none;">
                ▶ Adicionar ${grupo.titulo} (Opcional)
              </summary>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                ${itensHtml}
              </div>
            </details>
          `;
        } else {
          // Se for Guarnição ou Proteína, mostra normalmente
          html += `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #7b401f; border-bottom: 2px solid #e0d6cc; padding-bottom: 6px; margin-bottom: 12px; font-size: 1.1rem;">${grupo.titulo}</h3>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${itensHtml}
              </div>
            </div>
          `;
        }
      }
    });

    html += `
        <div style="margin-bottom: 10px;">
          <h3 style="color: #7b401f; border-bottom: 2px solid #e0d6cc; padding-bottom: 6px; margin-bottom: 12px; font-size: 1.1rem;">Observações da Marmita ${num}</h3>
          <textarea id="obsMarmita_${index}" maxlength="150" rows="2" style="width: 100%; padding: 10px; border: 1px solid #e0d6cc; border-radius: 6px; resize: vertical; word-wrap: break-word; font-family: inherit;" placeholder="Ex: Sem cebola, carne bem passada (Máx. 150 letras)...">${marmita.observacao || ''}</textarea>
        </div>
      </div> <!-- Fim do bloco da marmita -->
    `;
  });

  // Botão de adicionar nova marmita
  html += `
    <button type="button" onclick="adicionarMarmita()" style="width: 100%; background: #27ae60; color: #fff; border: none; padding: 14px; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-bottom: 15px;">
      + Adicionar Outra Marmita
    </button>
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
   CONTROLE DO MODAL DE ADMINISTRAÇÃO (LOGIN)
   ========================================================= */
// Encontra o botão Gerenciar (substitua 'btnGerenciar' pelo ID correto do seu botão no HTML se for diferente)
const btnOpenAdmin = document.getElementById('btnGerenciar') || document.getElementById('openAdmin');
const adminOverlay = document.getElementById('adminOverlay');
const closeAdminLogin = document.getElementById('closeAdminLogin');

// Evento para ABRIR a janela de login
if (btnOpenAdmin && adminOverlay) {
  btnOpenAdmin.addEventListener('click', (e) => {
    e.preventDefault();
    adminOverlay.classList.remove('hidden');
  });
}

// Evento para FECHAR a janela de login
if (closeAdminLogin && adminOverlay) {
  closeAdminLogin.addEventListener('click', (e) => {
    e.preventDefault();
    adminOverlay.classList.add('hidden');
  });
}

// Permite usar a tecla "Enter" no teclado para fazer o login
const adminPasswordInput = document.getElementById('adminPassword');
if (adminPasswordInput) {
  adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('adminLoginBtn').click(); // Simula o clique no botão
    }
  });
}

// Evento principal para o botão Entrar
const adminLoginBtn = document.getElementById('adminLoginBtn');
if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPassword').value.trim();

    if (!user || !pass) {
      alert('Por favor, preencha o usuário e a senha.');
      return;
    }

    // Feedback visual: muda o botão enquanto o servidor processa
    const textoOriginal = adminLoginBtn.innerText;
    adminLoginBtn.innerText = 'Aguarde...';
    adminLoginBtn.disabled = true;

    try {
      // Comunicação com o Backend para validar as credenciais
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });

      if (response.ok) {
        // Sucesso! A senha está correta.
        document.getElementById('adminLogin').style.display = 'none';

        // Aqui, no próximo passo, vamos criar a função que desenha a tabela de produtos
        alert('Login aprovado pelo servidor! A tela de edição será carregada a seguir.');
      } else {
        // Falha! Senha errada ou usuário não existe
        const data = await response.json();
        alert(data.error || 'Usuário ou senha incorretos.');
      }
    } catch (error) {
      console.error('Erro de rede ao fazer login:', error);
      alert('Erro de conexão com o servidor. Verifique sua internet.');
    } finally {
      // Restaura o botão ao estado original
      adminLoginBtn.innerText = textoOriginal;
      adminLoginBtn.disabled = false;
    }
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
   CÁLCULO DO PEDIDO (MÚLTIPLAS MARMITAS)
   ========================================================= */
async function calculateOrder() {
  salvarEstadoMarmitas(); // Lê e salva as opções que estavam clicadas

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
  mensagem += `${orderState.telefone.replace(/\D/g, '')}\n`;

  if (orderState.endereco) {
    mensagem += `${orderState.endereco}\n`;
  }

  mensagem += orderState.entrega ? `Entrega: (X)\nRetira: ( )\n\n` : `Entrega: ( )\nRetira: (X)\n\n`;

  // 2. Loop por todas as marmitas do pedido
  orderState.marmitas.forEach((marmita, index) => {
    const num = String(index + 1).padStart(2, '0');
    let subtotalMarmita = basePrice;
    totalGeral += basePrice;

    mensagem += `*Pedido ${num}:*\n`;

    // Busca os itens desta marmita específica
    const selGuarnicoes = marmita.guarnicoes.map(id => menu.find(i => String(i.id) === String(id))).filter(Boolean);
    const selProteinas = marmita.proteinas.map(id => menu.find(i => String(i.id) === String(id))).filter(Boolean);
    const selBebidas = marmita.bebidas.map(id => menu.find(i => String(i.id) === String(id))).filter(Boolean);
    const selSobremesas = marmita.sobremesas.map(id => menu.find(i => String(i.id) === String(id))).filter(Boolean);

    // Proteínas com "01"
    if (selProteinas.length > 0) selProteinas.forEach(p => { mensagem += `01 ${p.nome}\n`; });
    // Guarnições diretas
    if (selGuarnicoes.length > 0) selGuarnicoes.forEach(g => { mensagem += `${g.nome}\n`; });

    // Preço base
    mensagem += `${money(basePrice)}\n`;

    // Bebidas
    if (selBebidas.length > 0) selBebidas.forEach(b => {
      subtotalMarmita += Number(b.preco);
      totalGeral += Number(b.preco);
      mensagem += `01 ${b.nome} ${money(b.preco)}\n`;
    });

    // Sobremesas
    if (selSobremesas.length > 0) selSobremesas.forEach(s => {
      subtotalMarmita += Number(s.preco);
      totalGeral += Number(s.preco);
      mensagem += `01 ${s.nome} ${money(s.preco)}\n`;
    });

    if (marmita.observacao) {
      // Corta rigorosamente nas 150 letras, caso o cliente tente colar um texto maior
      const obsCortada = marmita.observacao.substring(0, 150);
      mensagem += `Obs: ${obsCortada}\n`;
    }

    mensagem += `---------------------------------------------------------------------------------\n`;
    mensagem += `Marmita ${num} = ${money(subtotalMarmita)}\n\n`;
  });

  // 3. Totais e Fechamento
  if (orderState.entrega) {
    totalGeral += deliveryPrice;
    mensagem += `Taxa de Entrega = ${money(deliveryPrice)}\n`;
  }

  mensagem += `*Total final ${money(totalGeral)}*\n`;
  mensagem += `Pedido: ${gerarCodigoPedido()}\n`;
  mensagem += `Verificação: ${gerarCodigoVerificacao()}\n\n`;
  mensagem += `💳 *Pagamento via PIX:*\nChave: 30571173845\n(Por favor, envie o comprovante por aqui!)`;

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
   BOTÃO DE ENVIAR AO WHATSAPP (PASSO 3 E RESET)
   ========================================================= */
if ($('sendRestaurant')) {
  $('sendRestaurant').addEventListener('click', (e) => {
    e.preventDefault();
    if (!calculatedOrder || !calculatedOrder.mensagem) {
      alert('Nenhum pedido calculado para enviar.');
      return;
    }

    // 1. Envia para o WhatsApp
    const phoneRestaurante = '5581920036280'; // Número do restaurante
    const url = `https://wa.me/${phoneRestaurante}?text=${encodeURIComponent(calculatedOrder.mensagem)}`;
    window.open(url, '_blank');

    // 2. Zera as variáveis de estado do pedido
    orderState = {
      nome: '',
      telefone: '',
      endereco: '',
      entrega: true,
      marmitas: [] // Esvazia o array para resetar os blocos
    };
    calculatedOrder = null;

    // 3. Limpa os campos de texto do formulário (Passo 1)
    if ($('customerName')) $('customerName').value = '';
    if ($('customerPhone')) $('customerPhone').value = '';
    if ($('customerAddress')) $('customerAddress').value = '';

    // Opcional: Volta o botão de entrega para o padrão (se existir)
    const defaultDelivery = document.querySelector('input[name="delivery"][value="true"]');
    if (defaultDelivery) defaultDelivery.checked = true;

    // 4. Fecha o modal de pedido e volta tudo para o Passo 1 silenciosamente
    if ($('orderOverlay')) $('orderOverlay').classList.add('hidden');
    setStep(1);
  });
}