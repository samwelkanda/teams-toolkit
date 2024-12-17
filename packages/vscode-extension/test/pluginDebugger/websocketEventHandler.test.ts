import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { Protocol } from "devtools-protocol";
import { WebSocketEventHandler } from "../../src/pluginDebugger/webSocketEventHandler";
import { CopilotDebugLog } from "../../src/pluginDebugger/copilotDebugLogOutput";

const { assert } = chai;

describe("WebSocketEventHandler", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("handleEvent", () => {
    it("should return 0 if WebSocket data is not relevant", () => {
      const response: Protocol.Network.WebSocketFrame = {
        opcode: 1,
        mask: false,
        payloadData: '{"type":1,"data":"irrelevant"}',
      };
      const result = WebSocketEventHandler.handleEvent(response);
      assert.strictEqual(result, 0);
    });

    it("should handle relevant WebSocket data and return the number of messages processed", () => {
      const response: Protocol.Network.WebSocketFrame = {
        opcode: 1,
        mask: false,
        payloadData:
          '{"type":2,"item":{"messages":[{"messageType":"DeveloperLogs","text":"{\\"enabledPlugins\\":[{\\"name\\":\\"da-product-support\\",\\"id\\":\\"U_0604864d-2329\\",\\"version\\":\\"1.0.0\\",\\"source\\":\\"MOS3\\"}],\\"functionDisplayName\\":\\"GetUserById\\"}","createdAt":"2023-01-01T00:00:00Z"}]}}\x1e',
      };
      const result = WebSocketEventHandler.handleEvent(response);
      assert.strictEqual(result, 1);
    });

    it("should handle parsing errors and log them", () => {
      const response: Protocol.Network.WebSocketFrame = {
        opcode: 1,
        mask: false,
        payloadData:
          '{"type":2,"item":{"messages":[{"messageType":"DeveloperLogs","text":"log message","createdAt":"2023-01-01T00:00:00Z"}]}}\x1e{"type":2,"item":{"messages":[{"messageType":"DeveloperLogs","text":"log message","createdAt":"2023-01-01T00:00:00Z"}]}}\x1e{"type":2,"item":{"messages":[{"messageType":"DeveloperLogs","text":"log message","createdAt":"2023-01-01T00:00:00Z"}]}}\x1e',
      };
      const showErrorMessageStub = sandbox.stub(vscode.window, "showErrorMessage");
      const appendLineStub = sandbox.stub(vscode.debug.activeDebugConsole, "appendLine");

      const result = WebSocketEventHandler.handleEvent(response);
      assert.strictEqual(result, 0);
      assert.isTrue(showErrorMessageStub.calledOnce);
      assert.isTrue(appendLineStub.calledOnce);
    });

    it("should log a warning if the parsed response object does not contain item or messages", () => {
      const response: Protocol.Network.WebSocketFrame = {
        opcode: 1,
        mask: false,
        payloadData: '{"type":2,"item":{}}\x1e',
      };
      const consoleWarnStub = sandbox.stub(console, "warn");
      const result = WebSocketEventHandler.handleEvent(response);
      assert.strictEqual(result, 0);
      assert.isTrue(consoleWarnStub.calledOnce);
      assert.isTrue(
        consoleWarnStub.calledWith("Parsed response object does not contain item or messages:")
      );
    });
  });

  describe("isWebSocketDataRelevant", () => {
    it("should return true for relevant WebSocket data", () => {
      const response: Protocol.Network.WebSocketFrame = {
        opcode: 1,
        mask: false,
        payloadData: '{"type":2,"data":"relevant"}',
      };
      const result = WebSocketEventHandler.isWebSocketDataRelevant(response);
      assert.isTrue(result);
    });

    it("should return false for irrelevant WebSocket data", () => {
      const response: Protocol.Network.WebSocketFrame = {
        opcode: 1,
        mask: false,
        payloadData: '{"type":1,"data":"irrelevant"}',
      };
      const result = WebSocketEventHandler.isWebSocketDataRelevant(response);
      assert.isFalse(result);
    });
  });

  describe("splitObjects", () => {
    it("should split payload data into individual objects", () => {
      const response: Protocol.Network.WebSocketFrame = {
        opcode: 1,
        mask: false,
        payloadData: '{"type":2,"data":"object1"}\x1e{"type":2,"data":"object2"}',
      };
      const result = WebSocketEventHandler.splitObjects(response);
      assert.deepEqual(result, ['{"type":2,"data":"object1"}', '{"type":2,"data":"object2"}']);
    });
  });

  describe("selectBotTextMessages", () => {
    it("should select bot text messages with messageType 'DeveloperLogs'", () => {
      const object = {
        item: {
          messages: [
            {
              messageType: "DeveloperLogs",
              text: "log message 1",
              createdAt: "2023-01-01T00:00:00Z",
            },
            { messageType: "OtherType", text: "log message 2", createdAt: "2023-01-01T00:00:00Z" },
          ],
        },
      };
      const result = WebSocketEventHandler.selectBotTextMessages(object);
      assert.deepEqual(result, [
        { messageType: "DeveloperLogs", text: "log message 1", createdAt: "2023-01-01T00:00:00Z" },
      ]);
    });
  });

  describe("convertBotMessageToChannelOutput", () => {
    it("should write bot message to channel output", () => {
      const botTextMessage = {
        messageType: "DeveloperLogs",
        text: "log message",
        createdAt: "2023-01-01T00:00:00Z",
      };
      chai.assert.throws(
        () => WebSocketEventHandler.convertBotMessageToChannelOutput(botTextMessage),
        /Error parsing logAsJson/
      );
    });
  });

  describe("convertBotMessageToChannelOutputJson", () => {
    it("should convert bot message to pretty-printed JSON and return CopilotDebugLog instance", () => {
      const botTextMessage = {
        messageType: "DeveloperLogs",
        text: '{"enabledPlugins": [{"name": "product-support", "id": "U_0604864d-2329", "version": "1.0.0"}]}',
        createdAt: "2023-01-01T00:00:00Z",
      };
      const result = WebSocketEventHandler.convertBotMessageToChannelOutputJson(botTextMessage);
      assert.instanceOf(result, CopilotDebugLog);
      assert.deepEqual(result.enabledPlugins, [
        { name: "product-support", id: "U_0604864d-2329", version: "1.0.0" },
      ]);
    });
  });

  describe("prettyPrintJson", () => {
    it("should pretty-print JSON text", () => {
      const jsonText = '{"key":"value"}';
      const result = WebSocketEventHandler.prettyPrintJson(jsonText);
      assert.strictEqual(result, '{\n  "key": "value"\n}');
    });
  });
});
