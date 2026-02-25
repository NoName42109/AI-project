export type MathType = 'quadratic' | 'viet_sum_product' | 'delta_condition' | 'nested_fraction' | 'viet_system';

export interface SyntheticData {
  latex_ground_truth: string;
  math_type: MathType;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Utility để sinh dữ liệu giả lập (Synthetic Data) chuyên cho Hệ thức Vi-ét lớp 9.
 * Dữ liệu này dùng để train model MER (Mathpix-like).
 */
export const syntheticDataGenerator = {
  generateQuadratic(): SyntheticData {
    const a = ['x^2', '-x^2', '2x^2', '3x^2', 'mx^2', '(m-1)x^2'][Math.floor(Math.random() * 6)];
    const b = ['+ 2x', '- 3x', '+ mx', '- 2(m-1)x', '+ (2m+1)x', '- x'][Math.floor(Math.random() * 6)];
    const c = ['+ 1', '- 3', '+ m', '- 2m + 1', '+ m^2 - 1', '- m^2'][Math.floor(Math.random() * 6)];
    
    return {
      latex_ground_truth: `${a} ${b} ${c} = 0`,
      math_type: 'quadratic',
      difficulty: a.includes('m') || b.includes('m') ? 'medium' : 'easy'
    };
  },

  generateVietSumProduct(): SyntheticData {
    const expressions = [
      'x_1 + x_2 = -\\frac{b}{a}',
      'x_1 x_2 = \\frac{c}{a}',
      'x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1 x_2',
      'x_1^3 + x_2^3 = (x_1 + x_2)^3 - 3x_1 x_2(x_1 + x_2)',
      '|x_1 - x_2| = \\frac{\\sqrt{\\Delta}}{|a|}',
      'x_1^2 x_2 + x_1 x_2^2 = x_1 x_2(x_1 + x_2)'
    ];
    const latex = expressions[Math.floor(Math.random() * expressions.length)];
    return {
      latex_ground_truth: latex,
      math_type: 'viet_sum_product',
      difficulty: latex.includes('^3') || latex.includes('|') ? 'hard' : 'medium'
    };
  },

  generateDeltaCondition(): SyntheticData {
    const expressions = [
      '\\Delta = b^2 - 4ac \\ge 0',
      '\\Delta\' = b\'^2 - ac > 0',
      '\\Delta = (2m-1)^2 - 4(m^2-1) \\ge 0',
      '\\Delta\' = (m-1)^2 - (m-3) > 0'
    ];
    return {
      latex_ground_truth: expressions[Math.floor(Math.random() * expressions.length)],
      math_type: 'delta_condition',
      difficulty: 'medium'
    };
  },

  generateNestedFraction(): SyntheticData {
    const expressions = [
      'A = \\frac{x_1}{x_2} + \\frac{x_2}{x_1} = \\frac{x_1^2 + x_2^2}{x_1 x_2}',
      'B = \\frac{1}{x_1 - 1} + \\frac{1}{x_2 - 1} = \\frac{x_1 + x_2 - 2}{x_1 x_2 - (x_1 + x_2) + 1}',
      '\\frac{x_1^2}{x_2} + \\frac{x_2^2}{x_1} = \\frac{x_1^3 + x_2^3}{x_1 x_2}'
    ];
    return {
      latex_ground_truth: expressions[Math.floor(Math.random() * expressions.length)],
      math_type: 'nested_fraction',
      difficulty: 'hard'
    };
  },

  generateVietSystem(): SyntheticData {
    const expressions = [
      '\\begin{cases} x_1 + x_2 = 2m \\\\ x_1 x_2 = m^2 - 1 \\end{cases}',
      '\\begin{cases} x_1 + x_2 = -\\frac{b}{a} \\\\ x_1 x_2 = \\frac{c}{a} \\end{cases}',
      '\\begin{cases} x_1 - 2x_2 = 3 \\\\ x_1 + x_2 = 2m \\end{cases}'
    ];
    return {
      latex_ground_truth: expressions[Math.floor(Math.random() * expressions.length)],
      math_type: 'viet_system',
      difficulty: 'hard'
    };
  },

  /**
   * Sinh ra một tập dataset JSONL
   */
  generateDataset(count: number): string {
    const generators = [
      this.generateQuadratic,
      this.generateVietSumProduct,
      this.generateDeltaCondition,
      this.generateNestedFraction,
      this.generateVietSystem
    ];

    let jsonl = '';
    for (let i = 0; i < count; i++) {
      const generator = generators[Math.floor(Math.random() * generators.length)].bind(this);
      const data = generator();
      // Thêm image_path giả lập để chuẩn format training
      const record = {
        image_path: `images/synthetic/viet_${String(i).padStart(5, '0')}.png`,
        ...data
      };
      jsonl += JSON.stringify(record) + '\n';
    }
    return jsonl;
  }
};
