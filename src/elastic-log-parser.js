export class ElasticLogParser {
  #bracketsPairs = [];
  #runtimeBracketsPairs = [];
  #initialStr = "";

  /**
   * Основной метод для парсинга строки в JSON.
   */
  parseObjStr(str) {
    this._reset();

    try {
      this._setInitialStr(str);
      return this._parseObjByStr(str);
    } catch (err) {
      console.log(err);
      console.error("Invalid str");
    }
  }

  _reset() {
    this._setBracketsPairs([]);
    this._setRuntimeBracketsPairs([]);
    this._setInitialStr("");
  }

  _setInitialStr(str) {
    this.#initialStr = str;
  }

  _setBracketsPairs(pairs) {
    this.#bracketsPairs = pairs;
  }

  _setRuntimeBracketsPairs(pairs) {
    this.#runtimeBracketsPairs = pairs;
  }

  _pushRuntimeBracketPair(pair) {
    this.#runtimeBracketsPairs.push(pair);
  }

  _getLastRuntimeBracket() {
    const lastEl =
      this.#runtimeBracketsPairs[this.#runtimeBracketsPairs.length - 1];

    return lastEl;
  }

  _removeLastBrackets() {
    const deletedPairs = this.#bracketsPairs.pop();

    this._pushRuntimeBracketPair(deletedPairs);
  }

  _removeLastBracketsAndReturn() {
    this._removeLastBrackets();

    return this._getLastRuntimeBracket();
  }

  _parseObj() {
    const [initStart, initEnd] = this._getLastRuntimeBracket();
    const acc = {};

    let needFindKey = true;
    let key = "";
    let value = "";

    for (let charIdx = initStart + 1; charIdx < initEnd; charIdx++) {
      const char = this.#initialStr[charIdx];

      if (char === "[") {
        this._removeLastBrackets();
        const { subArr, shiftIdx } = this._parseArray();

        acc[key.trim()] = subArr;

        key = "";
        value = "";
        needFindKey = true;
        charIdx = shiftIdx;

        continue;
      }

      if (char === "{") {
        const [, end] = this._removeLastBracketsAndReturn();
        const subObj = this._parseObj();

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
  }

  /**
   * Внутренний метод для парсинга строки в JSON.
   */
  _parseObjByStr(str) {
    this._setBracketsPairs(
      this._getBracketsPairsIdxs(str).sort((a, b) => b[0] - a[0])
    );

    const range = this._removeLastBracketsAndReturn();

    return this._parseObj(range);
  }

  /**
   * Внутренний метод парсинга массива.
   * TODO: Сделать над ним обертку, чтобы можно было использовать
   * вне parseObj
   */
  _parseArray() {
    const [initStart, initEnd] = this._getLastRuntimeBracket();
    const subArr = [];
    let item = "";
    let shiftIdx = initEnd;

    for (let i = initStart + 1; i < initEnd; i++) {
      const char = this.#initialStr[i];

      if (char === "[") {
        this._removeLastBrackets();
        const { subArr: deepArr, shiftIdx } = this._parseArray();

        item = deepArr;
        subArr.push(item);
        i = shiftIdx + 1;
        item = "";

        continue;
      }

      if (char === "{") {
        const [, end] = this._removeLastBracketsAndReturn();

        item = this._parseObj();
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
