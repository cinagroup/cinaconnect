#if UNITY_EDITOR
using NUnit.Framework;
using UnityEditor;
using Cinacoin.Editor;
using Cinacoin;

namespace Cinacoin.Tests.Runtime
{
    /// <summary>
    /// Tests for Cinacoin Editor configuration.
    /// </summary>
    public class CinacoinEditorTests
    {
        [Test]
        public void CinacoinVersion_ReturnsExpectedVersion()
        {
            Assert.AreEqual("0.1.0", CinacoinVersion.Value);
        }

        [Test]
        public void AppMetadata_CanBeCreated()
        {
            var metadata = new AppMetadata(
                "Test App",
                "A test dApp",
                "https://test.example.com",
                new[] { "https://test.example.com/icon.png" }
            );
            Assert.AreEqual("Test App", metadata.Name);
            Assert.AreEqual(1, metadata.Icons.Length);
        }

        [Test]
        public void AppMetadata_WithDefaultIcons()
        {
            var metadata = new AppMetadata("Test", "Test", "https://test.com");
            Assert.AreEqual(0, metadata.Icons.Length);
        }

        [Test]
        public void ConnectionResult_CreatedCorrectly()
        {
            var result = new ConnectionResult(
                "session-abc",
                new[] { "0x1234" },
                1,
                "metamask"
            );
            Assert.AreEqual("session-abc", result.SessionId);
            Assert.AreEqual(1, result.ChainId);
            Assert.AreEqual("metamask", result.ConnectorId);
        }

        [Test]
        public void SessionState_Disconnected_State()
        {
            var state = SessionState.Disconnected;
            Assert.AreEqual(ConnectionStatus.Disconnected, state.Status);
        }

        [Test]
        public void SessionState_Connected_State()
        {
            var state = SessionState.Connected(
                new[] { "0x1234" },
                1,
                "session-123",
                "walletconnect"
            );
            Assert.AreEqual(ConnectionStatus.Connected, state.Status);
            Assert.AreEqual(1, state.ChainId);
        }
    }
}
#endif
