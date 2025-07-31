/**
 * Calculadora de Tokens - Script Principal
 * Gerencia a interface do usuário e interações
 */

// Elementos DOM
const elements = {
  form: null,
  inputs: {},
  results: null,
  initialState: null,
  counters: {},
  buttons: {},
};

// Estado da aplicação
const appState = {
  isCalculating: false,
  currentResult: null,
  autoSave: true,
};

/**
 * Inicializa a aplicação
 */
function initializeApp() {
  try {
    // Capturar elementos DOM
    captureElements();

    // Configurar event listeners
    setupEventListeners();

    // Carregar dados salvos
    loadSavedData();

    // Configurar atualizações em tempo real
    setupRealTimeUpdates();

    console.log("Calculadora de Tokens inicializada com sucesso");

    // Mostrar mensagem de boas-vindas
    setTimeout(() => {
      TokenCalculatorUtils.showMessage(
        "Calculadora de Tokens carregada! Preencha os campos para começar.",
        "info",
        3000
      );
    }, 500);
  } catch (error) {
    console.error("Erro ao inicializar aplicação:", error);
    TokenCalculatorUtils.showMessage(
      "Erro ao carregar a aplicação. Recarregue a página.",
      "error"
    );
  }
}

/**
 * Captura referências dos elementos DOM
 */
function captureElements() {
  elements.form = document.getElementById("tokenForm");
  elements.results = document.getElementById("results");
  elements.initialState = document.getElementById("initialState");

  // Inputs
  elements.inputs = {
    inputTokenPrice: document.getElementById("inputTokenPrice"),
    outputTokenPrice: document.getElementById("outputTokenPrice"),
    cachedTokenPrice: document.getElementById("cachedTokenPrice"),
    inputText: document.getElementById("inputText"),
    outputText: document.getElementById("outputText"),
    quantity: document.getElementById("quantity"),
  };

  // Contadores de tokens
  elements.counters = {
    inputTokenCount: document.getElementById("inputTokenCount"),
    outputTokenCount: document.getElementById("outputTokenCount"),
  };

  // Botões
  elements.buttons = {
    clear: document.getElementById("clearBtn"),
  };

  // Verificar se todos os elementos foram encontrados
  const missingElements = [];

  if (!elements.form) missingElements.push("tokenForm");
  if (!elements.results) missingElements.push("results");
  if (!elements.initialState) missingElements.push("initialState");

  Object.entries(elements.inputs).forEach(([key, element]) => {
    if (!element) missingElements.push(key);
  });

  if (missingElements.length > 0) {
    throw new Error(
      `Elementos DOM não encontrados: ${missingElements.join(", ")}`
    );
  }
}

/**
 * Configura os event listeners
 */
function setupEventListeners() {
  // Submissão do formulário
  elements.form.addEventListener("submit", handleFormSubmit);

  // Botão limpar
  elements.buttons.clear.addEventListener("click", handleClearForm);

  // Inputs de texto para contagem de tokens
  elements.inputs.inputText.addEventListener(
    "input",
    TokenCalculatorUtils.debounce(updateInputTokenCount, 300)
  );

  elements.inputs.outputText.addEventListener(
    "input",
    TokenCalculatorUtils.debounce(updateOutputTokenCount, 300)
  );

  // Validação em tempo real dos preços
  Object.entries(elements.inputs).forEach(([key, input]) => {
    if (key.includes("Price")) {
      input.addEventListener(
        "input",
        TokenCalculatorUtils.debounce(() => validatePriceInput(input), 300)
      );
    }
  });

  // Validação da quantidade
  elements.inputs.quantity.addEventListener(
    "input",
    TokenCalculatorUtils.debounce(validateQuantityInput, 300)
  );

  // Auto-save quando habilitado
  if (appState.autoSave) {
    Object.values(elements.inputs).forEach((input) => {
      input.addEventListener(
        "input",
        TokenCalculatorUtils.debounce(saveFormData, 1000)
      );
    });
  }

  // Atalhos de teclado
  document.addEventListener("keydown", handleKeyboardShortcuts);
}

/**
 * Configura atualizações em tempo real
 */
function setupRealTimeUpdates() {
  // Atualizar contadores de tokens iniciais
  updateInputTokenCount();
  updateOutputTokenCount();
}

/**
 * Manipula a submissão do formulário
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  if (appState.isCalculating) {
    return;
  }

  try {
    appState.isCalculating = true;
    showLoadingState();

    // Coletar dados do formulário
    const formData = collectFormData();

    // Validar dados
    const validation = TokenCalculatorUtils.validateFormData(formData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join("\n"));
    }

    // Calcular
    const result = window.tokenCalculator.calculate(formData);

    // Exibir resultados
    displayResults(result);

    // Salvar estado atual
    appState.currentResult = result;

    // Feedback de sucesso
    TokenCalculatorUtils.showMessage(
      "Cálculo realizado com sucesso!",
      "success",
      3000
    );
  } catch (error) {
    console.error("Erro no cálculo:", error);
    TokenCalculatorUtils.showMessage(
      `Erro no cálculo: ${error.message}`,
      "error"
    );
  } finally {
    appState.isCalculating = false;
    hideLoadingState();
  }
}

/**
 * Coleta dados do formulário
 */
function collectFormData() {
  return {
    inputTokenPrice: parseFloat(elements.inputs.inputTokenPrice.value) || 0,
    outputTokenPrice: parseFloat(elements.inputs.outputTokenPrice.value) || 0,
    cachedTokenPrice: parseFloat(elements.inputs.cachedTokenPrice.value) || 0,
    inputText: elements.inputs.inputText.value.trim(),
    outputText: elements.inputs.outputText.value.trim(),
    quantity: parseInt(elements.inputs.quantity.value) || 1,
  };
}

/**
 * Exibe os resultados do cálculo
 */
function displayResults(result) {
  // Ocultar estado inicial
  elements.initialState.classList.add("hidden");

  // Mostrar área de resultados
  elements.results.classList.remove("hidden");
  TokenCalculatorUtils.addAnimatedClass(elements.results, "fade-in");

  // Atualizar resumo executivo
  updateExecutiveSummary(result.summary);

  // Atualizar detalhamento
  updateBreakdownDetails(result.breakdown, result.summary.quantity);

  // Atualizar cenários (se mais de um)
  if (result.summary.quantity > 1 || result.scenarios.length > 1) {
    updateScenariosTable(result.scenarios);
    document.getElementById("multipleScenarios").classList.remove("hidden");
  } else {
    document.getElementById("multipleScenarios").classList.add("hidden");
  }
}

/**
 * Atualiza o resumo executivo
 */
function updateExecutiveSummary(summary) {
  document.getElementById("totalCost").textContent =
    TokenCalculatorUtils.formatCurrency(summary.totalCost);

  document.getElementById("totalTokens").textContent =
    TokenCalculatorUtils.formatNumber(summary.totalTokens);
}

/**
 * Atualiza os detalhes do breakdown
 */
function updateBreakdownDetails(breakdown, quantity) {
  // Tokens de entrada
  document.getElementById("inputTokensDetail").textContent =
    TokenCalculatorUtils.formatNumber(breakdown.input.tokens * quantity);
  document.getElementById("inputCostDetail").textContent =
    TokenCalculatorUtils.formatCurrency(breakdown.input.totalCost);

  // Tokens de saída
  document.getElementById("outputTokensDetail").textContent =
    TokenCalculatorUtils.formatNumber(breakdown.output.tokens * quantity);
  document.getElementById("outputCostDetail").textContent =
    TokenCalculatorUtils.formatCurrency(breakdown.output.totalCost);

  // Tokens de cache
  document.getElementById("cachedTokensDetail").textContent =
    TokenCalculatorUtils.formatNumber(breakdown.cached.tokens * quantity);
  document.getElementById("cachedCostDetail").textContent =
    TokenCalculatorUtils.formatCurrency(breakdown.cached.totalCost);
}

/**
 * Atualiza a tabela de cenários
 */
function updateScenariosTable(scenarios) {
  const tableBody = document.getElementById("scenariosTable");

  // Limpar tabela
  tableBody.innerHTML = "";

  // Adicionar linhas
  scenarios.forEach((scenario) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50";

    row.innerHTML = `
            <td class="px-3 py-2 text-sm text-gray-900">
                ${TokenCalculatorUtils.formatNumber(scenario.quantity)}
            </td>
            <td class="px-3 py-2 text-sm font-medium text-gray-900">
                ${TokenCalculatorUtils.formatCurrency(scenario.totalCost)}
            </td>
            <td class="px-3 py-2 text-sm text-gray-900">
                ${TokenCalculatorUtils.formatNumber(scenario.totalTokens)}
            </td>
        `;

    tableBody.appendChild(row);
  });
}

/**
 * Atualiza contador de tokens de entrada
 */
function updateInputTokenCount() {
  const text = elements.inputs.inputText.value;
  const tokenCount = TokenCalculatorUtils.estimateTokens(text);
  elements.counters.inputTokenCount.textContent =
    TokenCalculatorUtils.formatNumber(tokenCount);
}

/**
 * Atualiza contador de tokens de saída
 */
function updateOutputTokenCount() {
  const text = elements.inputs.outputText.value;
  const tokenCount = TokenCalculatorUtils.estimateTokens(text);
  elements.counters.outputTokenCount.textContent =
    TokenCalculatorUtils.formatNumber(tokenCount);
}

/**
 * Valida input de preço
 */
function validatePriceInput(input) {
  const value = parseFloat(input.value);
  const validation = TokenCalculatorUtils.validateTokenPrice(value);

  // Remover classes anteriores
  input.classList.remove("input-valid", "input-invalid", "input-warning");

  if (input.value === "") {
    return; // Campo vazio, sem validação
  }

  if (validation.isValid) {
    input.classList.add("input-valid");
  } else {
    input.classList.add("input-invalid");
    // Mostrar tooltip com erro (implementar se necessário)
  }
}

/**
 * Valida input de quantidade
 */
function validateQuantityInput() {
  const value = parseInt(elements.inputs.quantity.value);
  const validation = TokenCalculatorUtils.validateQuantity(value);

  // Remover classes anteriores
  elements.inputs.quantity.classList.remove(
    "input-valid",
    "input-invalid",
    "input-warning"
  );

  if (elements.inputs.quantity.value === "") {
    return; // Campo vazio, sem validação
  }

  if (validation.isValid) {
    elements.inputs.quantity.classList.add("input-valid");
  } else {
    elements.inputs.quantity.classList.add("input-invalid");
  }
}

/**
 * Limpa o formulário
 */
function handleClearForm() {
  // Confirmar ação
  if (appState.currentResult) {
    const confirmed = confirm("Tem certeza que deseja limpar todos os campos?");
    if (!confirmed) {
      return;
    }
  }

  // Limpar inputs
  Object.values(elements.inputs).forEach((input) => {
    input.value = "";
    input.classList.remove("input-valid", "input-invalid", "input-warning");
  });

  // Resetar quantidade para 1
  elements.inputs.quantity.value = "1";

  // Atualizar contadores
  updateInputTokenCount();
  updateOutputTokenCount();

  // Ocultar resultados
  elements.results.classList.add("hidden");
  elements.initialState.classList.remove("hidden");

  // Limpar estado
  appState.currentResult = null;

  // Remover dados salvos
  TokenCalculatorUtils.saveToLocalStorage("form_data", {});

  // Feedback
  TokenCalculatorUtils.showMessage(
    "Formulário limpo com sucesso!",
    "info",
    2000
  );
}

/**
 * Salva dados do formulário
 */
function saveFormData() {
  if (!appState.autoSave) return;

  const formData = collectFormData();
  TokenCalculatorUtils.saveToLocalStorage("form_data", formData);
}

/**
 * Carrega dados salvos
 */
function loadSavedData() {
  const savedData = TokenCalculatorUtils.loadFromLocalStorage("form_data", {});

  if (savedData && Object.keys(savedData).length > 0) {
    // Preencher campos
    Object.entries(savedData).forEach(([key, value]) => {
      if (elements.inputs[key] && value !== undefined && value !== null) {
        elements.inputs[key].value = value;
      }
    });

    // Atualizar contadores
    updateInputTokenCount();
    updateOutputTokenCount();

    // Validar campos preenchidos
    setTimeout(() => {
      Object.entries(elements.inputs).forEach(([key, input]) => {
        if (key.includes("Price") && input.value) {
          validatePriceInput(input);
        }
      });

      if (elements.inputs.quantity.value) {
        validateQuantityInput();
      }
    }, 100);
  }
}

/**
 * Mostra estado de carregamento
 */
function showLoadingState() {
  const submitBtn = elements.form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "⏳ Calculando...";
    submitBtn.classList.add("loading");
  }
}

/**
 * Oculta estado de carregamento
 */
function hideLoadingState() {
  const submitBtn = elements.form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "🧮 Calcular Custos";
    submitBtn.classList.remove("loading");
  }
}

/**
 * Manipula atalhos de teclado
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + Enter para calcular
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    if (!appState.isCalculating) {
      elements.form.dispatchEvent(new Event("submit"));
    }
  }

  // Ctrl/Cmd + R para limpar (sobrescrever reload)
  if ((event.ctrlKey || event.metaKey) && event.key === "r" && event.shiftKey) {
    event.preventDefault();
    handleClearForm();
  }

  // Escape para focar no primeiro campo
  if (event.key === "Escape") {
    elements.inputs.inputTokenPrice.focus();
  }
}

/**
 * Manipula erros globais
 */
window.addEventListener("error", (event) => {
  console.error("Erro global:", event.error);
  TokenCalculatorUtils.showMessage(
    "Ocorreu um erro inesperado. Verifique o console para mais detalhes.",
    "error"
  );
});

/**
 * Manipula erros de Promise rejeitadas
 */
window.addEventListener("unhandledrejection", (event) => {
  console.error("Promise rejeitada:", event.reason);
  TokenCalculatorUtils.showMessage(
    "Erro de processamento. Tente novamente.",
    "error"
  );
});

// Inicializar quando DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
