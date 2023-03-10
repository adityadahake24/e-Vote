/* eslint-disable no-undef */
const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Online voting Platform", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admins").send({
      firstName: "User",
      lastName: "A",
      email: "user01@gmail.com",
      password: "user0123",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(302);
  });

  test("Creating a election", async () => {
    const agent = request.agent(server);
    await login(agent, "user01@gmail.com", "user0123");
    const res = await agent.get("/elections/create");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/elections").send({
      electionName: "Test election1",
      _csrf: csrfToken,
    });
    console.log(response);
    expect(response.statusCode).toBe(302);
  });
});

test("Creating a election", async () => {
  const agent = request.agent(server);
  await login(agent, "user01@gmail.com", "user0123");
  const res = await agent.get("/elections/create");
  const csrfToken = extractCsrfToken(res);
  const response = await agent.post("/elections").send({
    electionName: "Test election",
    _csrf: csrfToken,
  });
  console.log(response);
  expect(response.statusCode).toBe(302);
});

test("Adding a question", async () => {
  const agent = request.agent(server);
  await login(agent, "user01@gmail.com", "user0123");

  //create new election
  let res = await agent.get("/elections/create");
  let csrfToken = extractCsrfToken(res);
  await agent.post("/elections").send({
    electionName: "Test election",
    _csrf: csrfToken,
  });
  const groupedElectionsResponse = await agent
    .get("/elections")
    .set("Accept", "application/json");
  const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
  const electionCount = parsedGroupedResponse.elections.length;
  const latestElection = parsedGroupedResponse.elections[electionCount - 1];

  //add a question
  res = await agent.get(`/elections/${latestElection.id}/questions/create`);
  csrfToken = extractCsrfToken(res);
  let response = await agent
    .post(`/elections/${latestElection.id}/questions/create`)
    .send({
      question: "Test question",
      description: "Test description",
      _csrf: csrfToken,
    });
  expect(response.statusCode).toBe(302);
});

test("Deleting a question", async () => {
  const agent = request.agent(server);
  await login(agent, "user01@gmail.com", "user0123");

  //create new election
  let res = await agent.get("/elections/create");
  let csrfToken = extractCsrfToken(res);
  await agent.post("/elections").send({
    electionName: "Test election",
    _csrf: csrfToken,
  });
  const groupedElectionsResponse = await agent
    .get("/elections")
    .set("Accept", "application/json");
  const parsedGroupedElectionsResponse = JSON.parse(
    groupedElectionsResponse.text
  );
  const electionCount = parsedGroupedElectionsResponse.elections.length;
  const latestElection =
    parsedGroupedElectionsResponse.elections[electionCount - 1];

  //add a question
  res = await agent.get(`/elections/${latestElection.id}/questions/create`);
  csrfToken = extractCsrfToken(res);
  await agent.post(`/elections/${latestElection.id}/questions/create`).send({
    question: "Test question 1",
    description: "Test description 1",
    _csrf: csrfToken,
  });

  res = await agent.get(`/elections/${latestElection.id}/questions/create`);
  console.log(res.text);
  csrfToken = extractCsrfToken(res);
  await agent.post(`/elections/${latestElection.id}/questions/create`).send({
    question: "Test question 2",
    description: "Test description 2",
    _csrf: csrfToken,
  });

  const groupedQuestionsResponse = await agent
    .get(`/elections/${latestElection.id}/questions`)
    .set("Accept", "application/json");
  const parsedQuestionsGroupedResponse = JSON.parse(
    groupedQuestionsResponse.text
  );
  const questionCount = parsedQuestionsGroupedResponse.questions.length;
  const latestQuestion =
    parsedQuestionsGroupedResponse.questions[questionCount - 1];

  res = await agent.get(`/elections/${latestElection.id}/questions`);
  csrfToken = extractCsrfToken(res);
  const deleteResponse = await agent
    .delete(`/elections/${latestElection.id}/questions/${latestQuestion.id}`)
    .send({
      _csrf: csrfToken,
    });
  const parsedDeleteResponse = JSON.parse(deleteResponse.text).success;
  expect(parsedDeleteResponse).toBe(true);

  res = await agent.get(`/elections/${latestElection.id}/questions`);
  csrfToken = extractCsrfToken(res);

  const deleteResponse2 = await agent
    .delete(`/elections/${latestElection.id}/questions/${latestQuestion.id}`)
    .send({
      _csrf: csrfToken,
    });
  const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
  expect(parsedDeleteResponse2).toBe(false);
});

test("Adding a option", async () => {
  const agent = request.agent(server);
  await login(agent, "user01@gmail.com", "user0123");

  //create new election
  let res = await agent.get("/elections/create");
  let csrfToken = extractCsrfToken(res);
  await agent.post("/elections").send({
    electionName: "Test election",
    _csrf: csrfToken,
  });
  const groupedElectionsResponse = await agent
    .get("/elections")
    .set("Accept", "application/json");
  const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);
  const electionCount = parsedGroupedResponse.elections.length;
  const latestElection = parsedGroupedResponse.elections[electionCount - 1];

  //add a question
  res = await agent.get(`/elections/${latestElection.id}/questions/create`);
  csrfToken = extractCsrfToken(res);
  await agent.post(`/elections/${latestElection.id}/questions/create`).send({
    question: "Test question",
    description: "Test description",
    _csrf: csrfToken,
  });

  const groupedQuestionsResponse = await agent
    .get(`/elections/${latestElection.id}/questions`)
    .set("Accept", "application/json");
  const parsedQuestionsGroupedResponse = JSON.parse(
    groupedQuestionsResponse.text
  );
  const questionCount = parsedQuestionsGroupedResponse.questions.length;
  const latestQuestion =
    parsedQuestionsGroupedResponse.questions[questionCount - 1];

  res = await agent.get(
    `/elections/${latestElection.id}/questions/${latestQuestion.id}`
  );
  csrfToken = extractCsrfToken(res);

  res = await agent
    .post(`/elections/${latestElection.id}/questions/${latestQuestion.id}`)
    .send({
      _csrf: csrfToken,
      option: "Test option",
    });
  expect(res.statusCode).toBe(302);
});

test("Deleting a option", async () => {
  const agent = request.agent(server);
  await login(agent, "user01@gmail.com", "user0123");

  //create new election
  let res = await agent.get("/elections/create");
  let csrfToken = extractCsrfToken(res);
  await agent.post("/elections").send({
    electionName: "Test election",
    _csrf: csrfToken,
  });
  const groupedElectionsResponse = await agent
    .get("/elections")
    .set("Accept", "application/json");
  const parsedGroupedElectionsResponse = JSON.parse(
    groupedElectionsResponse.text
  );
  const electionCount = parsedGroupedElectionsResponse.elections.length;
  const latestElection =
    parsedGroupedElectionsResponse.elections[electionCount - 1];

  //add a question
  res = await agent.get(`/elections/${latestElection.id}/questions/create`);
  csrfToken = extractCsrfToken(res);
  await agent.post(`/elections/${latestElection.id}/questions/create`).send({
    question: "Test question 1",
    description: "Test description 1",
    _csrf: csrfToken,
  });

  const groupedQuestionsResponse = await agent
    .get(`/elections/${latestElection.id}/questions`)
    .set("Accept", "application/json");
  const parsedQuestionsGroupedResponse = JSON.parse(
    groupedQuestionsResponse.text
  );
  const questionCount = parsedQuestionsGroupedResponse.questions.length;
  const latestQuestion =
    parsedQuestionsGroupedResponse.questions[questionCount - 1];

  res = await agent.get(
    `/elections/${latestElection.id}/questions/${latestQuestion.id}`
  );
  csrfToken = extractCsrfToken(res);
  res = await agent
    .post(`/elections/${latestElection.id}/questions/${latestQuestion.id}`)
    .send({
      _csrf: csrfToken,
      option: "Test option",
    });

  const groupedOptionsResponse = await agent
    .get(`/elections/${latestElection.id}/questions/${latestQuestion.id}`)
    .set("Accept", "application/json");
  const parsedOptionsGroupedResponse = JSON.parse(
    groupedOptionsResponse.text
  );
  console.log(parsedOptionsGroupedResponse);
  const optionsCount = parsedOptionsGroupedResponse.options.length;
  const latestOption = parsedOptionsGroupedResponse.options[optionsCount - 1];

  res = await agent.get(
    `/elections/${latestElection.id}/questions/${latestQuestion.id}`
  );
  csrfToken = extractCsrfToken(res);
  const deleteResponse = await agent
    .delete(`/options/${latestOption.id}`)
    .send({
      _csrf: csrfToken,
    });
  const parsedDeleteResponse = JSON.parse(deleteResponse.text).success;
  expect(parsedDeleteResponse).toBe(true);

  res = await agent.get(
    `/elections/${latestElection.id}/questions/${latestQuestion.id}`
  );
  csrfToken = extractCsrfToken(res);
  const deleteResponse2 = await agent
    .delete(`/options/${latestOption.id}`)
    .send({
      _csrf: csrfToken,
    });
  const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
  expect(parsedDeleteResponse2).toBe(false);
});