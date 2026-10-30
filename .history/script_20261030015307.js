const BACKEND_URL = 'https://sd-copy-01-backend.vercel.app';

let menu = [];
let basePrice = 20;
let deliveryPrice = 5;
let orderState = null;
let calculatedOrder = null;
let adminDraft = [];

const $ =
  id => document.getElementById(id);


const money =
  value =>
    Number(value).toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    );


function esc(s) {

  return String(s ?? '')
    .replace(
      /[&<>"']/g,
      m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m])
    );

}


function available(cats) {

  return menu.filter(
    item =>
      cats.includes(
        item.categoria
      ) &&
      item.disponivelhx
  );

}

/* RELÓGIO */

function updateClock() {

  const d =
    new Date();


  $('datetime').textContent =
    d.toLocaleString(
      'pt-BR',
      {
        timeZone: 'America/Recife',
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    ); HTMLDListElement

}


setInterval(
  updateClock,
  1000
);

updateClock();


// URL do seu backend na Vercel
const BACKEND_URL = 'https://sd-copy-01-backend.vercel.app';



async function loadMenu() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cardapio`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('Erro ao carregar cardápio');
    }

    const data = await response.json();
    console.log("Cardápio recebido do backend:", data);

    // Garante que o menu é um array válido
    menu = Array.isArray(data) ? data : (data.itens || data.items || []);

  } catch (err) {
    console.warn('Não foi possível carregar o cardápio:', err);
    menu = [];
  }

  // Se você tiver uma função que renderiza as categorias na tela, chame-a aqui
  if (typeof renderMarmitas === 'function') {
    renderMarmitas();
  }
}

// Chame a função ao carregar a página
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
  const g = available(['Guarnições']);
  const p = available(['Proteínas']);

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
  const container = $('marmitas');
  if (!container) return;

  container.innerHTML = orderState.marmitas
    .map(choiceHTML)
    .join('');

  syncFormToState();
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
CALCULAR PEDIDO NO SERVIDOR (CORRIGIDO)
===================================================== */

async function calculateOrder() {
  clearErr('orderError2');

  // 🔥 PASSO CRUCIAL: Sincroniza os cliques dos inputs do HTML para dentro do orderState antes de validar!
  if (typeof syncFormToState === 'function') {
    syncFormToState();
  }

  const invalid =
    orderState.marmitas
      .findIndex(
        m =>
          m.proteinas.length < 1 ||
          m.proteinas.length > 2 ||
          m.guarnicoes.length > 4
      );

  if (invalid >= 0) {
    showErr(
      'orderError2',
      `Marmita ${invalid + 1}: escolha 1 ou 2 proteínas e no máximo 4 guarnições.`
    );
    return false;
  }

  const payload = {
    nome: orderState.nome,
    telefone: orderState.telefone,
    endereco: orderState.address,
    entrega: orderState.entrega,
    marmitas: orderState.marmitas
  };

  const response = await fetch(
    '/api/orders',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    showErr(
      'orderError2',
      data.erro || 'Não foi possível calcular o pedido.'
    );
    return false;
  }

  calculatedOrder = data;
  return true;
}


/* PASSO 2 -> PASSO 3 */

$('toStep3').onclick =
  async (event) => {

    event.preventDefault();

    console.log('TESTE 1: clicou em Encerrar e seguir');

    const ok =
      await calculateOrder();

    console.log('TESTE 2: calculateOrder terminou:', ok);

    if (!ok) {
      return;
    }

    console.log('TESTE 3: antes de setStep(3)');

    $('orderSummary')
      .textContent =
      calculatedOrder
        .mensagem;

    $('finalTotal')
      .textContent =
      `Total: ${money(
        calculatedOrder.total
      )}`;

    setStep(3);

    console.log('TESTE 4: depois de setStep(3)');
  };




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

/* ENVIAR PEDIDO AO RESTAURANTE (PROTEGIDO VIA BACKEND) */
$('sendRestaurant').onclick = async () => {
  if (!calculatedOrder) return;

  // 1. Lista de pratos que não exigem guarnições extras
  const PRATOS_COMPLETOS = ['Arrumadinho de charque', 'Arrumadinho de carne de sol', 'Cozido', 'Feijoada', 'Yakisoba'];

  // 2. Pega o texto do resumo exibido na tela
  const summaryText = $('orderSummary').innerText;

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
    const response = await fetch('/api/create-whatsapp-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderSummary: summaryText })
    });

    if (!response.ok) {
      throw new Error(`Erro do servidor: ${response.status}`);
    }

    const data = await response.json();

    if (data.url) {
      window.open(data.url, '_blank');
      closeOverlay('orderOverlay');
      resetOrder();
    } else {
      alert('Erro ao gerar o link para o WhatsApp.');
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    alert('Erro de conexão ao enviar o pedido.');
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


    const response =
      await fetch(
        '/api/admin/login',
        {

          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({

              username:
                $('adminUser')
                  .value,

              password:
                $('adminPassword')
                  .value

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

      return showErr(
        'adminError',
        data.erro ||
        'Falha no login.'
      );

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


/* SALVAR */

$('adminSave').onclick =
  async () => {

    const response =
      await fetch(
        '/api/admin/menu',
        {

          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({

              changes:
                adminDraft.map(
                  x => ({
                    id: x.id,
                    disponivel:
                      x.disponivel
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