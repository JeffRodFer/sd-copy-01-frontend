const BACKEND_URL = 'https://sd-copy-01-backend.vercel.app';

let menu = [];
let basePrice = 20;
let deliveryPrice = 5;
let orderState = null;
let calculatedOrder = null;
let adminDraft = [];

const $ = id => document.getElementById(id);

const money = value =>
  Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

function esc(s) {
  return String(s ?? '')
    .replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
}

function available(cats) {
  return menu
    .filter(item => cats.includes(item.categoria) && item.disponivel)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}

/* RELÓGIO */
function updateClock() {
  const d = new Date();
  const el = $('datetime');
  if (el) {
    el.textContent = d.toLocaleString('pt-BR', {
      timeZone: 'America/Recife',
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  }
}

setInterval(updateClock, 1000);
updateClock();

/* CARREGAR CARDÁPIO */
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

    // ✅ CHAMA A FUNÇÃO AQUI PARA RENDERIZAR NA TELA:
    renderizarCardapioPrincipal();

  } catch (err) {
    console.warn('Não foi possível carregar o cardápio:', err);
    menu = [];
  }
}

/* =========================================================
   RENDERIZAR CARDÁPIO COMPLETO NA PÁGINA PRINCIPAL
   ========================================================= */
function renderizarCardapioPrincipal() {
  const container = document.getElementById('menu');
  if (!container || !menu) return;

  const categorias = ['Guarnições', 'Proteínas', 'Gaseificadas', 'Sucos Naturais 350ml', 'Polpas 500ml', 'Sobremesas'];
  let html = '';

  categorias.forEach(cat => {
    const itensCat = menu
      .filter(item => item.categoria === cat && item.disponivel)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

    if (itensCat.length > 0) {
      html += `
        <div class="home-categoria-group" style="margin-bottom: 25px;">
          <h3 style="color: #7b401f; border-bottom: 2px solid #e0d6cc; padding-bottom: 6px; margin-bottom: 12px; font-size: 1.2rem;">${cat}</h3>
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px;">
            ${itensCat.map(x => `
              <li style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e0d6cc;">
                <span style="color: #333; font-weight: 500;">${esc(x.nome)}</span>
                <span style="font-weight: bold; color: #7b401f;">${x.preco > 0 ? money(x.preco) : ''}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

loadMenu();

// Função corrigida para exibir os itens disponíveis sem travar em propriedades inexistentes
function available(cats) {
  if (!menu || !Array.isArray(menu)) return [];
  return menu.filter(item => cats.includes(item.categoria) && (item.disponivel !== false));
}



/* RENDERIZAÇÃO DO CARDÁPIO */

function section(
  title,
  cats,
  accent,
  hidePrice
) {

  const all =
    menu.filter(
      x =>
        cats.includes(
          x.categoria
        )
    );


  return `

    <section class="section">

      <h2>
        ${title}
      </h2>

      <div class="grid">

        ${all.map(x => `

          <div
            class="
              card
              ${accent}
              ${x.disponivel ? '' : 'unavailable'}
            "
          >

            <strong>
              ${esc(x.nome)}
            </strong>

            ${!hidePrice
      ? `<span>${money(x.preco)}</span>`
      : ''
    }

            ${x.disponivel
      ? ''
      : '<span class="badge">Indisponível hoje</span>'
    }

          </div>

        `).join('')}

      </div>

    </section>

  `;

}


function renderMenu() {
  $('menu').innerHTML =
    section(
      'Guarnições',
      ['Guarnições'], // Lê o nome exato do banco de dados
      'accent-guarnicoes',
      true
    )
    +
    section(
      'Proteínas',
      ['Proteínas'], // Lê o nome exato do banco de dados
      'accent-proteinas',
      true
    )
    +
    section(
      'Bebidas e Sucos',
      ['Gaseificadas', 'Sucos Naturais 350ml', 'Polpas 500ml'], // <--- Os nomes exatos que estão gravados na base de dados
      'accent-bebidas',
      true
    )
    +
    section(
      'Sobremesas',
      ['Sobremesas'], // Lê o nome exato do banco de dados
      'accent-sobremesas',
      true
    );
}


/* MODAIS */

function openOverlay(id) {

  $(id)
    .classList
    .remove('hidden');

}


function closeOverlay(id) {

  $(id)
    .classList
    .add('hidden');

}


function setStep(n) {

  [
    'orderStep1',
    'orderStep2',
    'orderStep3'
  ].forEach(
    (id, i) =>
      $(id)
        .classList
        .toggle(
          'active',
          i === n - 1
        )
  );

}


function showErr(
  id,
  msg
) {

  $(id).textContent =
    msg;

  $(id)
    .classList
    .remove('hidden');

}


function clearErr(id) {

  $(id)
    .classList
    .add('hidden');

}


/* MÁSCARA TELEFONE */

function maskPhone(v) {

  let d =
    v
      .replace(/\D/g, '')
      .slice(0, 11);


  if (d.length <= 10) {

    return d
      .replace(
        /(\d{2})(\d{4})(\d{0,4})/,
        '($1) $2-$3'
      )
      .replace(/-$/, '');

  }


  return d
    .replace(
      /(\d{2})(\d{5})(\d{0,4})/,
      '($1) $2-$3'
    )
    .replace(/-$/, '');

}


$('customerPhone')
  .addEventListener(
    'input',
    e =>
      e.target.value =
      maskPhone(
        e.target.value
      )
  );


/* ABRIR PEDIDO */

/* ABRIR PEDIDO */
$('openOrder').onclick = () => {
  orderState = null;
  openOverlay('orderOverlay'); // Certifique-se de usar openOverlay (com 'p')
  setStep(1);
};


$('closeOrder1').onclick =
  () =>
    closeOverlay(
      'orderOverlay'
    );


$('backStep1').onclick =
  () =>
    setStep(1);


$('cancelFinal').onclick =
  () => {

    closeOverlay(
      'orderOverlay'
    );

    resetOrder();

  };


/* CRIAR MARMITAS */

function makeMarmitas(n) {

  return Array.from(
    {
      length: n
    },
    () => ({
      guarnicoes: [],
      proteinas: [],
      bebidas: {},
      sobremesas: {},
      observacao: ''
    })
  );

}


/* =========================================================
   HTML DE UMA MARMITA
   ========================================================= */

function choiceHTML(m, i) {
  // Filtra e já ordena alfabeticamente por nome usando localeCompare para aceitar acentos corretamente
  const g = available(['Guarnições']).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const p = available(['Proteínas']).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return `
        <div class="marmita">
          <h3>
            Marmita ${String(i + 1).padStart(2, '0')}
            — base ${money(basePrice)}
          </h3>

          <div class="choice-group">
            <h4>
              Guarnições
              <span class="limit">(máx. 4)</span>
            </h4>
            <div class="choices">
              ${g.map(x => `
                <label class="check">
                  <input
                    type="checkbox"
                    data-kind="g"
                    data-index="${i}"
                    data-id="${x.id}"
                  >
                  ${esc(x.nome)}
                </label>
              `).join('')}
            </div>
          </div>

          <div class="choice-group">
            <h4>
              Proteínas
              <span class="limit">(escolha 1 ou 2)</span>
            </h4>
            <div class="choices">
              ${p.map(x => `
                <label class="check">
                  <input
                    type="checkbox"
                    data-kind="p"
                    data-index="${i}"
                    data-id="${x.id}"
                  >
                  ${esc(x.nome)}
                </label>
              `).join('')}
            </div>
          </div>

          ${qtySection(
    'Bebidas',
    ['Gaseificadas', 'Sucos Naturais 350ml', 'Polpas 500ml'],
    i,
    'bebidas'
  )}

          ${qtySection(
    'Sobremesas',
    ['Sobremesas'],
    i,
    'sobremesas'
  )}

          <div class="field">
            <label>
              Observação
              <span class="limit">(máx. 90 caracteres)</span>
            </label>
            <textarea
              maxlength="90"
              data-obs="${i}"
              placeholder="Ex.: Bastante molho de fígado."
            ></textarea>
          </div>
        </div>
      `;
}


/*
  CONTROLES DE QUANTIDADE.
 
  O + e o - ficam obrigatoriamente
  na mesma linha.
*/

function qtySection(
  title,
  cats,
  i,
  key
) {

  const items =
    available(cats);


  return `

    <div class="choice-group">

      <h4>
        ${title}
      </h4>


      <div class="limit">

        Use 0 para:
        Não quero
        ${key === 'bebidas'
      ? 'bebida'
      : 'sobremesa'}.

      </div>


      <div class="qty-list">

        ${items.map(x => `

          <div class="qty-row">

            <span class="qty-name">
              ${esc(x.nome)}
            </span>


            <span class="qty-price">
              ${money(x.preco)}
            </span>


            <button
              type="button"
              class="qty-btn"
              data-qaction="minus"
              data-key="${key}"
              data-index="${i}"
              data-id="${x.id}"
            >
              −
            </button>


            <span
              class="qty-value"
              id="q-${key}-${i}-${x.id}"
            >
              0
            </span>


            <button
              type="button"
              class="qty-btn"
              data-qaction="plus"
              data-key="${key}"
              data-index="${i}"
              data-id="${x.id}"
            >
              +
            </button>

          </div>

        `).join('')}

      </div>

    </div>

  `;

}


/* =========================================================
   RENDERIZAR MARMITAS
   ========================================================= */

function renderMarmitas() {
  // Se o cliente ainda não avançou para a escolha das marmitas, não faz nada
  if (!orderState || !orderState.marmitas) return;

  const container = $('marmitasContainer') || $('marmitas');
  if (!container) return;

  container.innerHTML = orderState.marmitas
    .map((m, i) => choiceHTML(m, i)) // Garanta que usa a sua função de renderização de cada marmita
    .join('');

  if (typeof syncFormToState === 'function') {
    syncFormToState();
  }
}


/* =========================================================
   SINCRONIZAR FORMULÁRIO PARA O ESTADO (CORRIGIDO)
   ========================================================= */

function syncFormToState() {
  // 1. Lê os checkboxes de guarnições e proteínas marcados no HTML e atualiza o orderState
  document
    .querySelectorAll('#marmitas input[data-kind]')
    .forEach(el => {
      const i = Number(el.dataset.index);
      const key = el.dataset.kind === 'g' ? 'guarnicoes' : 'proteinas';
      const id = el.dataset.id;

      // Garante que o array existe na marmita
      if (!orderState.marmitas[i][key]) {
        orderState.marmitas[i][key] = [];
      }

      const indexInState = orderState.marmitas[i][key].indexOf(id);

      if (el.checked && indexInState === -1) {
        orderState.marmitas[i][key].push(id);
      } else if (!el.checked && indexInState !== -1) {
        orderState.marmitas[i][key].splice(indexInState, 1);
      }
    });

  // 2. Lê as observações digitadas
  document
    .querySelectorAll('#marmitas textarea[data-obs]')
    .forEach(el => {
      const i = Number(el.dataset.obs);
      if (orderState.marmitas[i]) {
        orderState.marmitas[i].observacao = el.value;
      }
    });
}


/* CHECKBOXES */

$('marmitas')
  .addEventListener(
    'change',
    e => {

      const el =
        e.target;


      if (
        el.matches(
          'input[data-kind]'
        )
      ) {

        const i =
          Number(
            el.dataset.index
          );


        const key =
          el.dataset.kind === 'g'
            ? 'guarnicoes'
            : 'proteinas';


        const arr =
          orderState
            .marmitas[i][key];


        if (el.checked) {

          if (
            key === 'guarnicoes' &&
            arr.length >= 4
          ) {

            el.checked =
              false;

            return;

          }


          if (
            !arr.includes(
              el.dataset.id
            )
          ) {

            arr.push(
              el.dataset.id
            );

          }

        } else {

          orderState
            .marmitas[i][key] =
            arr.filter(
              x =>
                x !==
                el.dataset.id
            );

        }

      }


      if (
        el.matches(
          'textarea[data-obs]'
        )
      ) {

        orderState
          .marmitas[
          Number(el.dataset.obs)
        ]
          .observacao =
          el.value
            .slice(0, 90);

      }

    }
  );


/* BOTÕES + E - */

$('marmitas')
  .addEventListener(
    'click',
    e => {

      const button =
        e.target.closest(
          'button[data-qaction]'
        );


      if (!button) {
        return;
      }


      const i =
        Number(
          button.dataset.index
        );


      const key =
        button.dataset.key;


      const id =
        button.dataset.id;


      const m =
        orderState
          .marmitas[i];


      const old =
        Number(
          m[key][id] || 0
        );


      const next =
        button.dataset.qaction === 'plus'
          ? Math.min(
            20,
            old + 1
          )
          : Math.max(
            0,
            old - 1
          );


      if (next === 0) {

        delete m[key][id];

      } else {

        m[key][id] =
          next;

      }


      const display =
        $(
          `q-${key}-${i}-${id}`
        );


      if (display) {

        display.textContent =
          next;

      }

    }
  );


/* PASSO 1 -> PASSO 2 */

$('toStep2').onclick =
  () => {

    clearErr(
      'orderError1'
    );


    const name =
      $('customerName')
        .value
        .trim();


    const phone =
      $('customerPhone')
        .value
        .replace(
          /\D/g,
          ''
        );


    const address =
      $('customerAddress')
        .value
        .trim();


    const n =
      Number(
        $('mealCount')
          .value
      );


    if (name.length < 2) {

      return showErr(
        'orderError1',
        'Informe o nome completo.'
      );

    }


    if (phone.length < 10) {

      return showErr(
        'orderError1',
        'Informe um telefone válido.'
      );

    }


    if (address.length < 5) {

      return showErr(
        'orderError1',
        'Informe o endereço.'
      );

    }


    if (
      !Number.isInteger(n) ||
      n < 1 ||
      n > 20
    ) {

      return showErr(
        'orderError1',
        'Quantidade de marmitas inválida.'
      );

    }


    orderState = {

      nome: name,

      telefone: phone,

      address: address,

      entrega:
        document
          .querySelector(
            'input[name="delivery"]:checked'
          )
          .value === 'true',

      marmitas:
        makeMarmitas(n)

    };


    renderMarmitas();

    setStep(2);

  };


/* =====================================================
CALCULAR PEDIDO NO SERVIDOR (COMPLETO)
===================================================== */

async function calculateOrder() {
  clearErr('orderError2');

  if (typeof syncFormToState === 'function') {
    syncFormToState();
  }

  const invalid = orderState.marmitas.findIndex(
    m => m.proteinas.length < 1 || m.proteinas.length > 2 || m.guarnicoes.length > 4
  );

  if (invalid >= 0) {
    showErr('orderError2', `Marmita ${invalid + 1}: escolha 1 ou 2 proteínas e no máximo 4 guarnições.`);
    return false;
  }

  let itensCarrinhoMap = {};
  orderState.marmitas.forEach(m => {
    m.proteinas.forEach(id => { itensCarrinhoMap[id] = (itensCarrinhoMap[id] || 0) + 1; });
    m.guarnicoes.forEach(id => { itensCarrinhoMap[id] = (itensCarrinhoMap[id] || 0) + 1; });
  });

  const itensCarrinho = Object.entries(itensCarrinhoMap).map(([id, quantidade]) => ({
    id: Number(id),
    quantidade
  }));

  const payload = {
    nome: orderState.nome,
    telefone: orderState.telefone,
    endereco: orderState.address,
    entrega: orderState.entrega,
    marmitas: orderState.marmitas,
    itensCarrinho: itensCarrinho
  };

  console.log("PAYLOAD enviado para o backend:", payload);

  const response = await fetch(`${BACKEND_URL}/api/registrar-venda`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Erro retornado pelo backend:", data);
    showErr('orderError2', data.erro || data.message || 'Não foi possível registrar o pedido.');
    return false;
  }

  // 1. Cálculos de preço
  let precoMarmita = 20.00;
  let taxaEntrega = orderState.entrega === 'delivery' ? 5.00 : 0.00;
  let totalMarmitas = orderState.marmitas.length * precoMarmita;
  let totalGeral = totalMarmitas + taxaEntrega;

  const nomeItem = (id) => {
    const it = menu.find(x => Number(x.id) === Number(id));
    return it ? it.nome : `Item #${id}`;
  };

  const codigoPedido = `RI-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const codigoVerificacao = Math.random().toString(36).substring(2, 10).toUpperCase();

  // 2. Montagem detalhada com os itens das marmitas escolhidas
  let msg = `*${orderState.nome}*\n`;
  msg += `${orderState.telefone}\n`;
  msg += `${orderState.address}\n`;
  msg += `Entrega: (${orderState.entrega === 'delivery' ? 'X' : ' '})\n`;
  msg += `Retira: (${orderState.entrega === 'retirada' ? 'X' : ' '})\n\n`;

  orderState.marmitas.forEach((m, index) => {
    msg += `*Pedido ${String(index + 1).padStart(2, '0')}:*\n`;
    m.proteinas.forEach(id => {
      msg += `01 ${nomeItem(id)}\n`;
    });
    m.guarnicoes.forEach(id => {
      msg += `${nomeItem(id)}\n`;
    });
    msg += `R$ ${precoMarmita.toFixed(2).replace('.', ',')}\n`;
    if (m.observacao) {
      msg += `Obs: ${m.observacao}\n`;
    }
    msg += `\n`;
  });

  msg += `---------------------------------------------------------------------------------\n`;
  orderState.marmitas.forEach((_, index) => {
    msg += `Marmita ${String(index + 1).padStart(2, '0')} = R$ ${precoMarmita.toFixed(2).replace('.', ',')}\n`;
  });
  if (orderState.entrega === 'delivery') {
    msg += `Taxa de Entrega = R$ ${taxaEntrega.toFixed(2).replace('.', ',')}\n`;
  }
  msg += `*Total final R$ ${totalGeral.toFixed(2).replace('.', ',')}*\n`;
  msg += `Pedido: ${codigoPedido}\n`;
  msg += `Verificação: ${codigoVerificacao}\n\n`;
  msg += `💳 *Pagamento via PIX:*\n`;
  msg += `Chave: 30571173845\n`;
  msg += `(Por favor, envie o comprovante por aqui!)`;

  // 3. Guarda a mensagem montada no front para exibir na tela e enviar ao WhatsApp
  calculatedOrder = {
    mensagem: msg,
    total: totalGeral,
    guarnicoesCount: orderState.marmitas.reduce((acc, m) => acc + m.guarnicoes.length, 0)
  };

  return true;


  /* PASSO 2 -> PASSO 3 */
  const btnStep3 = $('toStep3');
  if (btnStep3) {
    // Remove qualquer onclick inline antigo para evitar conflitos
    btnStep3.removeAttribute('onclick');

    btnStep3.onclick = async (event) => {
      event.preventDefault();
      console.log('TESTE 1: Clicou em Encerrar e seguir');

      let ok = true;
      if (typeof calculateOrder === 'function') {
        try {
          ok = await calculateOrder();
        } catch (e) {
          console.warn("Aviso no calculateOrder:", e);
          ok = true; // Permite avançar para não prender o utilizador
        }
      }

      if (!ok) {
        return;
      }

      // Preenche o resumo do pedido
      const summaryEl = $('orderSummary') || $('orderSummaryText');
      if (summaryEl && typeof calculatedOrder !== 'undefined' && calculatedOrder) {
        summaryEl.textContent = calculatedOrder.mensagem || '';
      }

      const totalEl = $('finalTotal');
      if (totalEl && typeof calculatedOrder !== 'undefined' && calculatedOrder) {
        totalEl.textContent = `Total: ${money(calculatedOrder.total || 0)}`;
      }

      // Avança para o Passo 3
      if (typeof setStep === 'function') {
        setStep(3);
      } else {
        // Fallback manual caso a função setStep falhe
        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        const s3 = $('orderStep3');
        if (s3) s3.classList.add('active');
      }

      console.log('TESTE 4: Entrou no Passo 3 com sucesso!');
    };
  }

  /* WHATSAPP */
  function sendWA(number) {
    const text = encodeURIComponent(calculatedOrder.mensagem);

    // 1. Obtém o número dinâmico do config.json
    const waNumber = restauranteConfig?.whatsapp || number || "5581920036280";

    // 2. Declara a variável cleanNumber que estava a faltar
    const cleanNumber = String(waNumber).replace(/\D/g, '');

    // 3. Abre o link no WhatsApp
    window.open(
      `https://wa.me/${cleanNumber}?text=${text}`,
      '_blank',
      'noopener'
    );
  }



  /* RESTAURANTE */

  /* =====================================================
  ENVIAR PEDIDO AO RESTAURANTE (DIRETO NO FRONTEND)
  ===================================================== */
  $('sendRestaurant').onclick = () => {
    if (!calculatedOrder) return;

    // 1. Lista de pratos que não exigem guarnições extras
    const PRATOS_COMPLETOS = ['Arrumadinho de charque', 'Arrumadinho de carne de sol', 'Cozido', 'Feijoada', 'Yakisoba'];

    // 2. Pega o texto do resumo exibido na tela ou do calculatedOrder
    const summaryText = $('orderSummary')?.innerText || calculatedOrder?.mensagem || 'Olá, gostaria de confirmar meu pedido de marmita!';

    // 3. Verifica se o resumo contém algum dos pratos completos
    const temPratoCompleto = PRATOS_COMPLETOS.some(prato =>
      summaryText.toLowerCase().includes(prato.toLowerCase())
    );

    // 4. Se não for um prato completo e faltar alguma seleção obrigatória
    if (!temPratoCompleto && calculatedOrder.guarnicoesCount === 0) {
      alert('Por favor, selecione as guarnições antes de enviar o pedido.');
      return; // Interrompe o envio
    }

    try {
      // Número do WhatsApp do restaurante com DDD
      const numeroWhatsApp = '5581920036280';

      // Cria o link oficial do WhatsApp com a mensagem codificada
      const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(summaryText)}`;

      // Abre o WhatsApp numa nova aba
      window.open(urlWhatsApp, '_blank');

      // Fecha o modal e limpa o pedido após enviar
      if (typeof closeOverlay === 'function') {
        closeOverlay('orderOverlay');
      }
      if (typeof resetOrder === 'function') {
        resetOrder();
      }

    } catch (error) {
      console.error('Erro ao abrir o WhatsApp:', error);
      alert('Erro ao gerar o link para o WhatsApp.');
    }
  };


  /* CÓPIA PARA CLIENTE */



  /* RESET */

  function resetOrder() {

    orderState =
      null;

    calculatedOrder =
      null;


    $('customerName')
      .value = '';


    $('customerPhone')
      .value = '';


    $('customerAddress')
      .value = '';


    $('mealCount')
      .value = 1;

  }


  /* =====================================================
     ADMIN
     ===================================================== */

  $('openAdmin').onclick =
    () => {

      clearErr(
        'adminError'
      );


      $('adminLogin')
        .classList
        .remove('hidden');


      $('adminPanel')
        .classList
        .add('hidden');


      $('adminPassword')
        .value = '';


      openOverlay(
        'adminOverlay'
      );

    };


  $('closeAdminLogin').onclick =
    () =>
      closeOverlay(
        'adminOverlay'
      );


  /* LOGIN */

  $('adminLoginBtn').onclick =
    async () => {

      clearErr(
        'adminError'
      );


      const response = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: $('adminUser').value,
          password: $('adminPassword').value
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        // Guarda o token no localStorage para as próximas requisições
        localStorage.setItem('adminToken', data.token);

        alert('Login realizado com sucesso!');
        // Aqui você chama a função que abre o painel de administração ou esconde o modal de login
      } else {
        alert(data.error || 'Erro ao fazer login.');
      }


      adminDraft =
        menu.map(
          x => ({
            ...x
          })
        );


      renderAdmin();


      $('adminLogin')
        .classList
        .add('hidden');


      $('adminPanel')
        .classList
        .remove('hidden');

    };


  /* ADMIN */

  function renderAdmin() {
    const groups = [
      [
        'Guarnições',
        ['Guarnições']
      ],
      [
        'Proteínas',
        ['Proteínas']
      ],
      [
        'Bebidas e Sucos',
        ['Bebidas e Sucos']
      ],
      [
        'Sobremesas',
        ['Sobremesas']
      ]
    ];


    $('adminItems')
      .innerHTML =

      groups.map(
        ([title, cats]) => `

          <div class="admin-section">

            <h3>
              ${title}
            </h3>

            ${adminDraft
            .filter(
              x =>
                cats.includes(
                  x.categoria
                )
            )
            .map(
              x => `

                    <div class="admin-item">

                      <span>
                        ${esc(x.nome)}
                      </span>


                      <label class="switch">

                        <input
                          type="checkbox"
                          data-admin-id="${x.id}"
                          ${x.disponivel
                  ? 'checked'
                  : ''
                }
                        >

                        <span class="slider"></span>

                      </label>

                    </div>

                  `
            )
            .join('')
          }

          </div>

        `
      )
        .join('');

  }


  /* ALTERAR SWITCH */

  $('adminItems')
    .addEventListener(
      'change',
      e => {

        const id =
          e.target
            .dataset
            .adminId;


        if (!id) {
          return;
        }


        const item =
          adminDraft.find(
            i => String(i.id) === String(id));


        if (item) {

          item.disponivel =
            e.target.checked;

        }

      }
    );


  /* SALVAR 
  
  console.log("Token guardado:", localStorage.getItem('adminToken'));
  */

  $('adminSave').onclick =
    async () => {

      const token = localStorage.getItem('adminToken'); // Ou o nome que usou para salvar o token no login

      const response = await fetch(
        `${BACKEND_URL}/api/admin/atualizar-lote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Envia o token JWT de segurança
          },
          body: JSON.stringify({
            produtos: adminDraft.map(
              x => ({
                id: x.id,
                preco: x.preco,       // Inclui o preço atual
                estoque: x.estoque,   // Inclui o estoque atual
                disponivel: x.disponivel
              })
            )
          })
        }
      );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (!response.ok) {

        if (
          response.status === 401
        ) {

          showErr(
            'adminError',
            'Sua sessão expirou. Faça login novamente.'
          );


          $('adminLogin')
            .classList
            .remove('hidden');


          $('adminPanel')
            .classList
            .add('hidden');

        } else {

          showErr(
            'adminError',
            data.erro ||
            'Não foi possível salvar.'
          );

        }


        return;

      }

      menu =
        adminDraft.map(
          x => ({ ...x })
        );


      renderMenu();


      alert(
        'Alterações salvas.'
      );


      closeOverlay(
        'adminOverlay'
      );

    };


  /* LOGOUT */

  $('adminClose').onclick =
    async () => {

      await fetch(
        '/api/admin/logout',
        {
          method: 'POST'
        }
      ).catch(
        () => { }
      );


      closeOverlay(
        'adminOverlay'
      );

    };

  closeOverlay(
    'adminOverlay'
  );

  /* WHATSAPP */
  function sendWA(number) {
    const text = encodeURIComponent(calculatedOrder.mensagem);

    // Pega o número dinâmico do config.json
    const waNumber = restauranteConfig?.whatsapp || number || "5581920036280";

    // Limpa para deixar apenas números
    const cleanNumber = String(waNumber).replace(/\D/g, '');

    window.open(
      `https://wa.me/${cleanNumber}?text=${text}`,
      '_blank',
      'noopener'
    );
  }

  /* CONFIGURAÇÃO DINÂMICA DO RESTAURANTE */
  let restauranteConfig = {};

  async function carregarConfiguracoes() {
    try {
      // 👇 AQUI: Trocamos o link completo pelo caminho relativo!
      const resposta = await fetch('/api/config');
      if (resposta.ok) {
        restauranteConfig = await resposta.json();
        console.log('Configurações carregadas com sucesso:', restauranteConfig);

        // Se tiver um elemento com a ID 'nome-restaurante' no seu HTML
        const elementoNome = document.getElementById('nome-restaurante');
        if (elementoNome && restauranteConfig.nomeRestaurante) {
          elementoNome.textContent = restauranteConfig.nomeRestaurante;
        }

        // Atualiza o botão flutuante do WhatsApp
        const linkWa = document.getElementById('wa-float-link');
        if (linkWa && restauranteConfig.whatsapp) {
          const numeroLimpo = String(restauranteConfig.whatsapp).replace(/\D/g, '');
          linkWa.href = `https://wa.me/${numeroLimpo}`;
        }
      }
    } catch (erro) {
      console.error('Erro ao buscar /api/config:', erro);
    }

  }
  // Função global garantida na raiz do script.js
  window.clicarEncerrarPedido = async function (event) {
    if (event) {
      event.preventDefault();
    }

    console.log('TESTE 1: Clicou com sucesso no botão Encerrar e seguir!');

    const ok = await calculateOrder();
    console.log('TESTE 2: calculateOrder terminou:', ok);

    if (!ok) {
      return;
    }

    console.log('TESTE 3: antes de setStep(3)');

    const summaryEl = document.getElementById('orderSummary') || document.getElementById('orderSummaryText');
    if (summaryEl && calculatedOrder) {
      summaryEl.textContent = calculatedOrder.mensagem || '';
    }

    const totalEl = document.getElementById('finalTotal');
    if (totalEl && calculatedOrder) {
      const valorTotal = Number(calculatedOrder.total || 0);
      totalEl.textContent = `Total: R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
    }

    if (typeof setStep === 'function') {
      setStep(3);
    }

    console.log('TESTE 4: depois de setStep(3)');
  };
}