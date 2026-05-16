using UnityEngine;
using UnityEngine.UI;
using System;

namespace OnChainUX.UI
{
    /// <summary>
    /// Unity UI Connect Button (UGUI compatible).
    /// Mirrors the core-sdk + react ConnectButton API surface.
    /// 
    /// Attach to a GameObject with a Button and Text components.
    /// Automatically updates button text and color based on connection state.
    /// </summary>
    [RequireComponent(typeof(Button))]
    public class ConnectButton : MonoBehaviour
    {
        [Header("Appearance")]
        [SerializeField] private string disconnectedLabel = "Connect Wallet";
        [SerializeField] private string connectingLabel = "Connecting...";
        [SerializeField] private string connectedFormat = "{0}";
        [SerializeField] private string errorLabel = "Retry";

        [Header("Colors")]
        [SerializeField] private Color disconnectedColor = new Color(0.23f, 0.51f, 0.96f);
        [SerializeField] private Color connectedColor = new Color(0.13f, 0.59f, 0.43f);
        [SerializeField] private Color errorColor = new Color(0.86f, 0.22f, 0.22f);
        [SerializeField] private Color connectingColor = new Color(0.5f, 0.5f, 0.5f);

        [Header("Components")]
        [SerializeField] private Text _labelText;
        [SerializeField] private Image _buttonImage;
        [SerializeField] private GameObject _loadingIndicator;

        private Button _button;
        private ConnectionStatus _currentStatus = ConnectionStatus.Disconnected;
        private string _currentAddress;

        private void Awake()
        {
            _button = GetComponent<Button>();

            if (_labelText == null)
                _labelText = GetComponentInChildren<Text>(true);

            if (_buttonImage == null)
                _buttonImage = GetComponent<Image>();

            _button.onClick.AddListener(HandleButtonClick);
        }

        private void OnEnable()
        {
            if (OnChainUXManager.Instance != null)
            {
                OnChainUXManager.Instance.OnStateChanged += HandleStateChange;
                UpdateUI(OnChainUXManager.Instance.Status,
                    OnChainUXManager.Instance.IsConnected && OnChainUXManager.Instance.Accounts.Length > 0
                        ? FormatAddress(OnChainUXManager.Instance.Accounts[0])
                        : null);
            }
        }

        private void OnDisable()
        {
            if (OnChainUXManager.Instance != null)
            {
                OnChainUXManager.Instance.OnStateChanged -= HandleStateChange;
            }
        }

        private void HandleStateChange(SessionState state)
        {
            UpdateUI(state.Status, state.Accounts != null && state.Accounts.Length > 0 ? FormatAddress(state.Accounts[0]) : null);
        }

        private void HandleButtonClick()
        {
            switch (_currentStatus)
            {
                case ConnectionStatus.Disconnected:
                case ConnectionStatus.Error:
                    OnConnectRequested?.Invoke();
                    break;
                case ConnectionStatus.Connected:
                    OnConnectedClick?.Invoke();
                    break;
            }
        }

        private void UpdateUI(ConnectionStatus status, string address)
        {
            _currentStatus = status;
            _currentAddress = address;

            switch (status)
            {
                case ConnectionStatus.Disconnected:
                    SetLabel(disconnectedLabel);
                    SetColor(disconnectedColor);
                    SetLoading(false);
                    break;

                case ConnectionStatus.Connecting:
                    SetLabel(connectingLabel);
                    SetColor(connectingColor);
                    SetLoading(true);
                    break;

                case ConnectionStatus.Connected:
                    SetLabel(string.Format(connectedFormat, address ?? "Connected"));
                    SetColor(connectedColor);
                    SetLoading(false);
                    break;

                case ConnectionStatus.Error:
                    SetLabel(errorLabel);
                    SetColor(errorColor);
                    SetLoading(false);
                    break;
            }
        }

        private void SetLabel(string text)
        {
            if (_labelText != null)
                _labelText.text = text;
        }

        private void SetColor(Color color)
        {
            if (_buttonImage != null)
                _buttonImage.color = color;
        }

        private void SetLoading(bool loading)
        {
            if (_loadingIndicator != null)
                _loadingIndicator.SetActive(loading);
        }

        private string FormatAddress(string address)
        {
            if (string.IsNullOrEmpty(address) || address.Length <= 10)
                return address;
            return $"{address.Substring(0, 6)}...{address.Substring(address.Length - 4)}";
        }

        /// Event fired when connect is requested (disconnected state).
        public event Action OnConnectRequested;

        /// Event fired when button is clicked in connected state.
        public event Action OnConnectedClick;
    }
}
