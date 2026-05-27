using UnityEngine;
using UnityEngine.UI;
using System;

namespace Cinacoin.UI
{
    /// <summary>
    /// Unity UI Connect Button (UGUI compatible).
    /// Mirrors the core-sdk + react ConnectButton API surface.
    /// 
    /// Attach to a GameObject with a Button and Text components.
    /// Automatically updates button text and color based on connection state.
    /// Handles real wallet connection flow when CinacoinManager is available.
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

        [Header("Behavior")]
        [SerializeField] private bool _autoConnect = false;
        [SerializeField] private string[] _supportedWalletIds = { "metamask", "walletconnect", "rainbow", "trust", "coinbase" };

        private Button _button;
        private ConnectionStatus _currentStatus = ConnectionStatus.Disconnected;
        private string _currentAddress;
        private ConnectModal _connectModal;

        private void Awake()
        {
            _button = GetComponent<Button>();

            if (_labelText == null)
                _labelText = GetComponentInChildren<Text>(true);

            if (_buttonImage == null)
                _buttonImage = GetComponent<Image>();

            _button.onClick.AddListener(HandleButtonClick);
        }

        private void Start()
        {
            // Find ConnectModal in scene
            _connectModal = FindObjectOfType<ConnectModal>();

            // Attempt to restore session
            if (_autoConnect && CinacoinManager.Instance != null)
            {
                CinacoinManager.Instance.RestoreAsync().ContinueWith(task =>
                {
                    if (task.Result.Status == ConnectionStatus.Connected)
                    {
                        UpdateUI(task.Result.Status,
                            task.Result.Accounts != null && task.Result.Accounts.Length > 0
                                ? FormatAddress(task.Result.Accounts[0])
                                : null);
                    }
                });
            }
        }

        private void OnEnable()
        {
            if (CinacoinManager.Instance != null)
            {
                CinacoinManager.Instance.OnStateChanged += HandleStateChange;
                CinacoinManager.Instance.OnWalletConnected += HandleWalletConnected;
                CinacoinManager.Instance.OnWalletDisconnected += HandleWalletDisconnected;
                CinacoinManager.Instance.OnErrorEvent += HandleError;

                // Sync with current state
                UpdateUI(CinacoinManager.Instance.Status,
                    CinacoinManager.Instance.IsConnected && CinacoinManager.Instance.Accounts.Length > 0
                        ? FormatAddress(CinacoinManager.Instance.Accounts[0])
                        : null);
            }
        }

        private void OnDisable()
        {
            if (CinacoinManager.Instance != null)
            {
                CinacoinManager.Instance.OnStateChanged -= HandleStateChange;
                CinacoinManager.Instance.OnWalletConnected -= HandleWalletConnected;
                CinacoinManager.Instance.OnWalletDisconnected -= HandleWalletDisconnected;
                CinacoinManager.Instance.OnErrorEvent -= HandleError;
            }
        }

        private void HandleStateChange(SessionState state)
        {
            UpdateUI(state.Status,
                state.Accounts != null && state.Accounts.Length > 0
                    ? FormatAddress(state.Accounts[0])
                    : null);
        }

        private void HandleWalletConnected(ConnectionResult result)
        {
            _currentAddress = result.Accounts != null && result.Accounts.Length > 0
                ? FormatAddress(result.Accounts[0])
                : "Connected";
            UpdateUI(ConnectionStatus.Connected, _currentAddress);
        }

        private void HandleWalletDisconnected()
        {
            _currentAddress = null;
            UpdateUI(ConnectionStatus.Disconnected, null);
        }

        private void HandleError(string error)
        {
            UpdateUI(ConnectionStatus.Error, _currentAddress);
            Debug.LogWarning($"[Cinacoin:ConnectButton] Error: {error}");
        }

        private void HandleButtonClick()
        {
            switch (_currentStatus)
            {
                case ConnectionStatus.Disconnected:
                case ConnectionStatus.Error:
                    // Reset error state and show wallet selection
                    OnConnectRequested?.Invoke();
                    ShowWalletSelection();
                    break;
                case ConnectionStatus.Connected:
                    // Show account menu or disconnect option
                    OnConnectedClick?.Invoke();
                    break;
            }
        }

        /// Show the wallet selection modal.
        private void ShowWalletSelection()
        {
            if (_connectModal != null)
            {
                var wallets = WalletRegistry.GetAll();
                _connectModal.Show(wallets, _supportedWalletIds);
            }
            else
            {
                Debug.LogWarning("[Cinacoin:ConnectButton] ConnectModal not found in scene. " +
                    "Add a ConnectModal component or wire up OnConnectRequested event.");
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
                    _button.interactable = true;
                    break;

                case ConnectionStatus.Connecting:
                    SetLabel(connectingLabel);
                    SetColor(connectingColor);
                    SetLoading(true);
                    _button.interactable = false;
                    break;

                case ConnectionStatus.Connected:
                    SetLabel(string.Format(connectedFormat, address ?? "Connected"));
                    SetColor(connectedColor);
                    SetLoading(false);
                    _button.interactable = true;
                    break;

                case ConnectionStatus.Error:
                    SetLabel(errorLabel);
                    SetColor(errorColor);
                    SetLoading(false);
                    _button.interactable = true;
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
