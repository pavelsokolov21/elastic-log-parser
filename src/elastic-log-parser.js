export class ElasticLogParser {
  /**
   * Основной метод для парсинга строки в JSON.
   */
  parseObj(str) {
    try {
      return this._parseObj(str);
    } catch {
      console.error("Invalid str");
    }
  }

  /**
   * Внутренний метод для парсинга строки в JSON.
   */
  _parseObj(str) {
    const bracketsPairs = this._getBracketsPairsIdxs(str).sort(
      (a, b) => b[0] - a[0]
    );

    const inner = (range) => {
      const [initStart, initEnd] = range;
      const acc = {};

      let needFindKey = true;
      let key = "";
      let value = "";

      for (let charIdx = initStart + 1; charIdx < initEnd; charIdx++) {
        const char = str[charIdx];

        if (char === "[") {
          const range = bracketsPairs.pop();
          const { subArr, shiftIdx } = this._parseArray(
            str,
            range,
            bracketsPairs,
            inner
          );

          acc[key.trim()] = subArr;

          key = "";
          value = "";
          needFindKey = true;
          charIdx = shiftIdx;

          continue;
        }

        if (char === "{") {
          const range = bracketsPairs.pop();
          const [start, end] = range;
          const subObj = inner(range);

          acc[key.trim()] = subObj;

          key = "";
          value = "";
          needFindKey = true;
          charIdx = end;

          continue;
        }

        if (char === "," || charIdx === initEnd - 1) {
          if (char !== ",") {
            value += char;
          }

          needFindKey = true;

          acc[key.trim()] = this._parsePrimitive(value);

          key = "";
          value = "";

          continue;
        }

        if (char === "=") {
          needFindKey = false;

          continue;
        }

        if (needFindKey) {
          key += char;
        } else {
          value += char;
        }
      }

      return acc;
    };

    const range = bracketsPairs.pop();

    return inner(range);
  }

  /**
   * Внутренний метод парсинга массива.
   * TODO: Сделать над ним обертку, чтобы можно было использовать
   * вне parseObj
   */
  _parseArray(str, [initStart, initEnd], bracketsPairs, objParser) {
    const subArr = [];
    let item = "";
    let shiftIdx = initEnd;

    for (let i = initStart + 1; i < initEnd; i++) {
      const char = str[i];

      if (char === "[") {
        const range = bracketsPairs.pop();
        const { subArr: deepArr, shiftIdx } = this._parseArray(
          str,
          range,
          bracketsPairs,
          objParser
        );

        item = deepArr;
        subArr.push(item);
        i = shiftIdx + 1;
        item = "";

        continue;
      }

      if (char === "{") {
        const range = bracketsPairs.pop();
        const [, end] = range;

        item = objParser(range);
        subArr.push(item);
        i = end;
        item = "";

        continue;
      }

      if (char === "," || i === initEnd - 1) {
        if (char !== ",") {
          item += char;
        }

        item = this._parsePrimitive(item);
        subArr.push(item);
        item = "";
        i++;

        continue;
      }

      item += char;
    }

    return { subArr, shiftIdx };
  }

  /**
   * Внутренний метод для парсинга значений.
   */
  _parsePrimitive(value) {
    const nilHashMap = new Map([
      ["null", null],
      ["undefined", undefined],
    ]);

    const booleanHashMap = new Map([
      ["true", true],
      ["false", false],
    ]);

    if (booleanHashMap.has(value)) {
      return booleanHashMap.get(value);
    }

    if (nilHashMap.has(value)) {
      return nilHashMap.get(value);
    }

    if (!isNaN(value) && value !== "") {
      return Number(value);
    }

    if (typeof value === "string" && value.endsWith("}")) {
      return value.slice(0, value.length - 1);
    }

    return value;
  }

  /**
   * Внутренний метод получения индексов скобок.
   * TODO: На основе этого метода сделать проверку валидности строки.
   */
  _getBracketsPairsIdxs(str) {
    const indexPairs = [];
    const stack = [];

    for (let i = 0; i < str.length; i++) {
      if (str[i] === "[" || str[i] === "{") {
        stack.push(i);
      } else if (str[i] === "]" || str[i] === "}") {
        if (stack.length > 0) {
          let startIndex = stack.pop();
          indexPairs.push([startIndex, i]);
        }
      }
    }

    return indexPairs;
  }
}
