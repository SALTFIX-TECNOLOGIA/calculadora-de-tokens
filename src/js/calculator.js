/**
 * Calculadora de Tokens - Lógica de Cálculo
 * Contém todas as funções relacionadas ao cálculo de custos de tokens
 */

class TokenCalculator {
  constructor() {
    this.history = [];
    this.currentCalculation = null;
  }

  /**
   * Calcula o custo total baseado nos parâmetros fornecidos
   * @param {object} params - Parâmetros do cálculo
   * @returns {object} - Resultado do cálculo
   */
  calculate(params) {
    const {
      inputTokenPrice,
      outputTokenPrice,
      cachedTokenPrice,
      inputText,
      outputText,
      quantity,
    } = params;

    // Validar parâmetros
    const validation = this.validateParameters(params);
    if (!validation.isValid) {
      throw new Error(`Parâmetros inválidos: ${validation.errors.join(", ")}`);
    }

    // Estimar tokens
    const inputTokens = TokenCalculatorUtils.estimateTokens(inputText);
    const outputTokens = TokenCalculatorUtils.estimateTokens(outputText);
    const cachedTokens = Math.floor(inputTokens * 0.1); // Assume 10% dos tokens de entrada como cache

    // Calcular custos individuais
    const inputCost = inputTokens * inputTokenPrice;
    const outputCost = outputTokens * outputTokenPrice;
    const cachedCost = cachedTokens * cachedTokenPrice;

    // Custo por operação
    const costPerOperation = inputCost + outputCost + cachedCost;
    const totalTokensPerOperation = inputTokens + outputTokens + cachedTokens;

    // Custo total considerando a quantidade
    const totalCost = costPerOperation * quantity;
    const totalTokens = totalTokensPerOperation * quantity;

    // Criar resultado
    const result = {
      id: TokenCalculatorUtils.generateUniqueId(),
      timestamp: new Date().toISOString(),
      parameters: { ...params },
      breakdown: {
        input: {
          tokens: inputTokens,
          pricePerToken: inputTokenPrice,
          cost: inputCost,
          totalCost: inputCost * quantity,
        },
        output: {
          tokens: outputTokens,
          pricePerToken: outputTokenPrice,
          cost: outputCost,
          totalCost: outputCost * quantity,
        },
        cached: {
          tokens: cachedTokens,
          pricePerToken: cachedTokenPrice,
          cost: cachedCost,
          totalCost: cachedCost * quantity,
        },
      },
      summary: {
        costPerOperation,
        totalCost,
        totalTokensPerOperation,
        totalTokens,
        quantity,
        averageCostPerToken: totalCost / totalTokens,
      },
      scenarios: this.generateScenarios(
        costPerOperation,
        totalTokensPerOperation,
        quantity
      ),
    };

    // Salvar no histórico
    this.addToHistory(result);
    this.currentCalculation = result;

    return result;
  }

  /**
   * Valida os parâmetros de entrada
   * @param {object} params - Parâmetros a serem validados
   * @returns {object} - Resultado da validação
   */
  validateParameters(params) {
    const result = {
      isValid: true,
      errors: [],
    };

    // Validar preços
    const priceValidations = [
      { value: params.inputTokenPrice, name: "Token de entrada" },
      { value: params.outputTokenPrice, name: "Token de saída" },
      { value: params.cachedTokenPrice, name: "Token de cache" },
    ];

    priceValidations.forEach(({ value, name }) => {
      const validation = TokenCalculatorUtils.validateTokenPrice(value);
      if (!validation.isValid) {
        result.errors.push(`${name}: ${validation.message}`);
        result.isValid = false;
      }
    });

    // Validar textos
    if (!params.inputText || params.inputText.trim().length === 0) {
      result.errors.push("Texto de entrada é obrigatório");
      result.isValid = false;
    }

    if (!params.outputText || params.outputText.trim().length === 0) {
      result.errors.push("Texto de saída é obrigatório");
      result.isValid = false;
    }

    // Validar quantidade
    const quantityValidation = TokenCalculatorUtils.validateQuantity(
      params.quantity
    );
    if (!quantityValidation.isValid) {
      result.errors.push(`Quantidade: ${quantityValidation.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Gera cenários de simulação
   * @param {number} costPerOperation - Custo por operação
   * @param {number} tokensPerOperation - Tokens por operação
   * @param {number} baseQuantity - Quantidade base
   * @returns {Array} - Array com cenários
   */
  generateScenarios(costPerOperation, tokensPerOperation, baseQuantity) {
    const scenarios = [];
    const quantities = this.getScenarioQuantities(baseQuantity);

    quantities.forEach((quantity) => {
      scenarios.push({
        quantity,
        totalCost: costPerOperation * quantity,
        totalTokens: tokensPerOperation * quantity,
        costPerToken: costPerOperation / tokensPerOperation,
      });
    });

    return scenarios;
  }

  /**
   * Gera quantidades para cenários baseado na quantidade base
   * @param {number} baseQuantity - Quantidade base
   * @returns {Array} - Array com quantidades
   */
  getScenarioQuantities(baseQuantity) {
    const quantities = new Set([baseQuantity]);

    // Adicionar múltiplos da quantidade base
    const multipliers = [0.5, 2, 5, 10, 50, 100];
    multipliers.forEach((multiplier) => {
      const quantity = Math.max(1, Math.round(baseQuantity * multiplier));
      if (quantity <= TokenCalculatorUtils.CONSTANTS.MAX_QUANTITY) {
        quantities.add(quantity);
      }
    });

    // Adicionar quantidades fixas comuns
    const commonQuantities = [1, 10, 100, 1000, 10000];
    commonQuantities.forEach((quantity) => {
      if (quantity <= TokenCalculatorUtils.CONSTANTS.MAX_QUANTITY) {
        quantities.add(quantity);
      }
    });

    // Converter para array e ordenar
    return Array.from(quantities).sort((a, b) => a - b);
  }

  /**
   * Adiciona um cálculo ao histórico
   * @param {object} calculation - Resultado do cálculo
   */
  addToHistory(calculation) {
    this.history.unshift(calculation);

    // Limitar histórico a 50 itens
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }

    // Salvar no localStorage
    TokenCalculatorUtils.saveToLocalStorage("calculator_history", this.history);
  }

  /**
   * Carrega o histórico do localStorage
   */
  loadHistory() {
    const savedHistory = TokenCalculatorUtils.loadFromLocalStorage(
      "calculator_history",
      []
    );
    this.history = Array.isArray(savedHistory) ? savedHistory : [];
  }

  /**
   * Limpa o histórico
   */
  clearHistory() {
    this.history = [];
    this.currentCalculation = null;
    TokenCalculatorUtils.saveToLocalStorage("calculator_history", []);
  }

  /**
   * Obtém o histórico de cálculos
   * @returns {Array} - Array com histórico
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Obtém um cálculo específico por ID
   * @param {string} id - ID do cálculo
   * @returns {object|null} - Cálculo encontrado ou null
   */
  getCalculationById(id) {
    return this.history.find((calc) => calc.id === id) || null;
  }

  /**
   * Exporta um cálculo para CSV
   * @param {object} calculation - Cálculo a ser exportado
   * @returns {string} - String CSV
   */
  exportToCSV(calculation) {
    if (!calculation) {
      calculation = this.currentCalculation;
    }

    if (!calculation) {
      throw new Error("Nenhum cálculo disponível para exportação");
    }

    const data = [];

    // Resumo
    data.push({
      Tipo: "Resumo",
      Descrição: "Custo Total",
      Quantidade: calculation.summary.quantity,
      Tokens: calculation.summary.totalTokens,
      Custo: TokenCalculatorUtils.formatCurrency(calculation.summary.totalCost),
    });

    // Detalhamento
    const types = ["input", "output", "cached"];
    const typeNames = ["Entrada", "Saída", "Cache"];

    types.forEach((type, index) => {
      const breakdown = calculation.breakdown[type];
      data.push({
        Tipo: typeNames[index],
        Descrição: `Tokens de ${typeNames[index].toLowerCase()}`,
        Quantidade: calculation.summary.quantity,
        Tokens: breakdown.tokens * calculation.summary.quantity,
        Custo: TokenCalculatorUtils.formatCurrency(breakdown.totalCost),
      });
    });

    const headers = ["Tipo", "Descrição", "Quantidade", "Tokens", "Custo"];
    return TokenCalculatorUtils.convertToCSV(data, headers);
  }

  /**
   * Exporta cenários para CSV
   * @param {object} calculation - Cálculo com cenários
   * @returns {string} - String CSV
   */
  exportScenariosToCSV(calculation) {
    if (!calculation) {
      calculation = this.currentCalculation;
    }

    if (!calculation || !calculation.scenarios) {
      throw new Error("Nenhum cenário disponível para exportação");
    }

    const data = calculation.scenarios.map((scenario) => ({
      Quantidade: scenario.quantity,
      "Total de Tokens": TokenCalculatorUtils.formatNumber(
        scenario.totalTokens
      ),
      "Custo Total": TokenCalculatorUtils.formatCurrency(scenario.totalCost),
      "Custo por Token": TokenCalculatorUtils.formatCurrency(
        scenario.costPerToken
      ),
    }));

    const headers = [
      "Quantidade",
      "Total de Tokens",
      "Custo Total",
      "Custo por Token",
    ];
    return TokenCalculatorUtils.convertToCSV(data, headers);
  }

  /**
   * Compara dois cálculos
   * @param {object} calc1 - Primeiro cálculo
   * @param {object} calc2 - Segundo cálculo
   * @returns {object} - Resultado da comparação
   */
  compareCalculations(calc1, calc2) {
    if (!calc1 || !calc2) {
      throw new Error("Dois cálculos são necessários para comparação");
    }

    const comparison = {
      totalCost: {
        calc1: calc1.summary.totalCost,
        calc2: calc2.summary.totalCost,
        difference: calc2.summary.totalCost - calc1.summary.totalCost,
        percentageChange:
          ((calc2.summary.totalCost - calc1.summary.totalCost) /
            calc1.summary.totalCost) *
          100,
      },
      totalTokens: {
        calc1: calc1.summary.totalTokens,
        calc2: calc2.summary.totalTokens,
        difference: calc2.summary.totalTokens - calc1.summary.totalTokens,
        percentageChange:
          ((calc2.summary.totalTokens - calc1.summary.totalTokens) /
            calc1.summary.totalTokens) *
          100,
      },
      averageCostPerToken: {
        calc1: calc1.summary.averageCostPerToken,
        calc2: calc2.summary.averageCostPerToken,
        difference:
          calc2.summary.averageCostPerToken - calc1.summary.averageCostPerToken,
        percentageChange:
          ((calc2.summary.averageCostPerToken -
            calc1.summary.averageCostPerToken) /
            calc1.summary.averageCostPerToken) *
          100,
      },
    };

    return comparison;
  }

  /**
   * Calcula estatísticas do histórico
   * @returns {object} - Estatísticas
   */
  getHistoryStatistics() {
    if (this.history.length === 0) {
      return null;
    }

    const totalCosts = this.history.map((calc) => calc.summary.totalCost);
    const totalTokens = this.history.map((calc) => calc.summary.totalTokens);

    return {
      totalCalculations: this.history.length,
      averageCost: totalCosts.reduce((a, b) => a + b, 0) / totalCosts.length,
      minCost: Math.min(...totalCosts),
      maxCost: Math.max(...totalCosts),
      averageTokens:
        totalTokens.reduce((a, b) => a + b, 0) / totalTokens.length,
      minTokens: Math.min(...totalTokens),
      maxTokens: Math.max(...totalTokens),
      lastCalculation: this.history[0].timestamp,
    };
  }
}

// Criar instância global
window.tokenCalculator = new TokenCalculator();

// Carregar histórico ao inicializar
window.tokenCalculator.loadHistory();
