import {
  pipe,
  eq,
  setObjPropertyWithKeyTransformer,
  mutateObj,
  trim,
  pick,
} from "./utils/common";

const isOpenSquareBracket = eq("[");
const isOpenCurlyBracket = eq("{");
const isComma = eq(",");
const isEqualSign = eq("=");
const mutateValue = mutateObj("value");
const mutateKey = mutateObj("key");
const mutateKeyToEmptyStr = mutateObj("key")("");
const mutateValueToEmptyStr = mutateObj("value")("");
const mutateNeedFindKeyToTrue = mutateObj("needFindKey")(true);
const mutateNeedFindKeyToFalse = mutateObj("needFindKey")(false);
const pickKey = pick("key");
const pickValue = pick("value");
const pickNeedFindKey = pick("needFindKey");

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
    const state = {
      key: "",
      value: "",
      needFindKey: true,
    };
    const setObjValue = setObjPropertyWithKeyTransformer(acc)(trim);
    const resetState = () =>
      pipe([mutateKeyToEmptyStr, mutateValueToEmptyStr])(state);
    const mutateNeedFindKeyToTrueWithState = () =>
      mutateNeedFindKeyToTrue(state);
    const mutateNeedFindKeyToFalseWithState = () =>
      mutateNeedFindKeyToFalse(state);
    const pickKeyWithState = () => pickKey(state);
    const pickValueWithState = () => pickValue(state);
    const pickNeedFindKeyWithState = () => pickNeedFindKey(state);

    for (let charIdx = initStart + 1; charIdx < initEnd; charIdx++) {
      const char = this.#initialStr[charIdx];

      if (isOpenSquareBracket(char)) {
        const [, end] = this._removeLastBracketsAndReturn();
        const subArr = this._parseArray();

        setObjValue(pickKeyWithState())(subArr);
        resetState();
        mutateNeedFindKeyToTrueWithState();

        charIdx = end;

        continue;
      }

      if (isOpenCurlyBracket(char)) {
        const [, end] = this._removeLastBracketsAndReturn();
        const subObj = this._parseObj();

        setObjValue(pickKeyWithState())(subObj);
        resetState();
        mutateNeedFindKeyToTrueWithState();

        charIdx = end;

        continue;
      }

      if (isComma(char) || charIdx === initEnd - 1) {
        if (!isComma(char)) {
          mutateValue(pickValueWithState() + char)(state);
        }

        setObjValue(pickKeyWithState())(
          this._parsePrimitive(pickValueWithState())
        );
        resetState();
        mutateNeedFindKeyToTrueWithState();

        continue;
      }

      if (isEqualSign(char)) {
        mutateNeedFindKeyToFalseWithState();

        continue;
      }

      if (pickNeedFindKeyWithState()) {
        mutateKey(pickKeyWithState() + char)(state);
      } else {
        mutateValue(pickValueWithState() + char)(state);
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

    for (let i = initStart + 1; i < initEnd; i++) {
      const char = this.#initialStr[i];

      if (isOpenSquareBracket(char)) {
        const [, shiftIdx] = this._removeLastBracketsAndReturn();
        const deepArr = this._parseArray();

        item = deepArr;
        subArr.push(item);
        i = shiftIdx + 1;
        item = "";

        continue;
      }

      if (isOpenCurlyBracket(char)) {
        const [, end] = this._removeLastBracketsAndReturn();

        item = this._parseObj();
        subArr.push(item);
        i = end;
        item = "";

        continue;
      }

      if (isComma(char) || i === initEnd - 1) {
        if (!isComma(char)) {
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

    return subArr;
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
