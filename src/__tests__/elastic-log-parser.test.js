import { describe, expect, it } from "bun:test";
import { ElasticLogParser } from "../elastic-log-parser";

describe("parseObj", () => {
  const elasticParser = new ElasticLogParser();

  it.each([
    ["{account=some}", { account: "some" }],
    ["{account=dash-string}", { account: "dash-string" }],
    [
      "{account=dash-string, secondField=anotherValue}",
      { account: "dash-string", secondField: "anotherValue" },
    ],
    ["{account=5}", { account: 5 }],
    ["{account={foo=innerObjValue}}", { account: { foo: "innerObjValue" } }],
    [
      "{account={foo={superDeepKey=5}}}",
      { account: { foo: { superDeepKey: 5 } } },
    ],
    ["{account=[1, 2]}", { account: [1, 2] }],
    ["{account=[[1, 2], 3]}", { account: [[1, 2], 3] }],
    ["{account=[1, [2, 3]]}", { account: [1, [2, 3]] }],
    ["{account=[{foo=bar}]}", { account: [{ foo: "bar" }] }],
    ["{account=[1, {foo=bar}]}", { account: [1, { foo: "bar" }] }],
    [
      "{account=[1, {foo=[some, value]}]}",
      { account: [1, { foo: ["some", "value"] }] },
    ],
    ["{account=null}", { account: null }],
    ["{account=true}", { account: true }],
    ["{account=false}", { account: false }],
  ])("should parse string to JSON %#", (data, expected) => {
    const result = elasticParser.parseObj(data);

    expect(result).toEqual(expected);
  });
});

describe("getBracketsPairsIdxs", () => {
  const elasticParser = new ElasticLogParser();

  it.each([
    ["[]", [[0, 1]]],
    [
      "[{}]",
      [
        [1, 2],
        [0, 3],
      ],
    ],
    ["[1, 3]", [[0, 5]]],
    ["{foo:'bar'}", [[0, 10]]],
  ])("should get indexes of brackets %#", (data, expected) => {
    const result = elasticParser._getBracketsPairsIdxs(data);

    expect(result).toEqual(expected);
  });
});
