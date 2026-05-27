/**
 * PushNotificationHandler — APNs integration for wallet notifications.
 *
 * Handles push notification registration, token management, and notification
 * routing for wallet connection events (pending transactions, connection
 * requests, etc.).
 *
 * ## Usage
 * ```swift
 * let pushHandler = PushNotificationHandler()
 *
 * // In AppDelegate:
 * pushHandler.registerForPushNotifications()
 *
 * // Handle token registration:
 * pushHandler.setDeviceToken(deviceToken)
 *
 * // Handle incoming notifications:
 * pushHandler.handleNotification(userInfo: userInfo)
 * ```
 *
 * ## Info.plist Setup
 * Enable Push Notifications capability in your Xcode project.
 */

import Foundation
import UserNotifications

/// Type of wallet push notification.
public enum WalletNotificationType: String, Sendable {
    /// Pending transaction to approve/reject.
    case transactionRequest = "transaction_request"
    /// New wallet connection request.
    case connectionRequest = "connection_request"
    /// Transaction confirmed/mined.
    case transactionConfirmed = "transaction_confirmed"
    /// Session expired or disconnected.
    case sessionExpired = "session_expired"
    /// Generic wallet notification.
    case other = "other"
}

/// Parsed wallet notification data.
public struct WalletNotification: Sendable {
    /// Notification type.
    public let type: WalletNotificationType
    /// Notification title.
    public let title: String
    /// Notification body text.
    public let body: String
    /// Associated session ID, if any.
    public let sessionId: String?
    /// Associated transaction data, if any.
    public let transactionData: [String: Any]?
    /// Raw userInfo dictionary.
    public let userInfo: [AnyHashable: Any]
    
    public init(
        type: WalletNotificationType,
        title: String,
        body: String,
        sessionId: String? = nil,
        transactionData: [String: Any]? = nil,
        userInfo: [AnyHashable: Any]
    ) {
        self.type = type
        self.title = title
        self.body = body
        self.sessionId = sessionId
        self.transactionData = transactionData
        self.userInfo = userInfo
    }
}

/// Handler for Apple Push Notifications in Cinacoin.
public final class PushNotificationHandler {
    
    /// Device token for APNs registration.
    public private(set) var deviceToken: String?
    
    /// Whether push notifications are registered.
    public private(set) var isRegistered: Bool = false
    
    /// Callback for incoming wallet notifications.
    public var onNotification: ((WalletNotification) -> Void)?
    
    /// Callback for registration success.
    public var onTokenRegistered: ((String) -> Void)?
    
    /// Callback for registration failure.
    public var onRegistrationFailed: ((Error) -> Void)?
    
    /// Register for push notifications.
    /// Call this from AppDelegate.application(_:didFinishLaunchingWithOptions:).
    public func registerForPushNotifications() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { [weak self] granted, error in
            DispatchQueue.main.async {
                if granted {
                    self?.isRegistered = true
                } else if let error = error {
                    self?.onRegistrationFailed?(error)
                }
            }
        }
        
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
    
    /// Set the device token received from APNs.
    /// Call this from AppDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:).
    /// - Parameter deviceToken: The raw device token data.
    public func setDeviceToken(_ deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString
        
        // In production: send this token to your Cinacoin relay server
        // to enable wallet-specific push notifications
        
        onTokenRegistered?(tokenString)
    }
    
    /// Handle a failed push notification registration.
    /// Call this from AppDelegate.application(_:didFailToRegisterForRemoteNotificationsWithError:).
    /// - Parameter error: The registration error.
    public func handleRegistrationFailure(_ error: Error) {
        isRegistered = false
        onRegistrationFailed?(error)
    }
    
    /// Handle an incoming push notification.
    /// Call this from your notification center delegate.
    /// - Parameter userInfo: The notification payload.
    public func handleNotification(userInfo: [AnyHashable: Any]) {
        let notification = parseNotification(userInfo: userInfo)
        onNotification?(notification)
    }
    
    /// Handle a foreground notification presentation.
    /// - Parameters:
    ///   - userInfo: The notification payload.
    ///   - completionHandler: Called to determine presentation options.
    public func handleForegroundPresentation(
        userInfo: [AnyHashable: Any],
        completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let notification = parseNotification(userInfo: userInfo)
        onNotification?(notification)
        
        // Show alert and badge for wallet notifications
        completionHandler([.alert, .badge, .sound])
    }
    
    /// Handle a notification response (user tapped on notification).
    /// - Parameter response: The user's response.
    public func handleNotificationResponse(_ response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        let notification = parseNotification(userInfo: userInfo)
        
        // Route based on notification type
        switch notification.type {
        case .transactionRequest:
            // In production: open transaction approval UI
            break
        case .connectionRequest:
            // In production: open connection approval UI
            break
        case .transactionConfirmed:
            // In production: show transaction confirmation
            break
        case .sessionExpired:
            // In production: trigger reconnection flow
            break
        case .other:
            break
        }
    }
    
    /// Unregister from push notifications.
    public func unregister() {
        deviceToken = nil
        isRegistered = false
        UIApplication.shared.unregisterForRemoteNotifications()
    }
    
    // MARK: - Private
    
    private func parseNotification(userInfo: [AnyHashable: Any]) -> WalletNotification {
        let aps = userInfo["aps"] as? [String: Any] ?? [:]
        let alert = aps["alert"] as? [String: Any] ?? [:]
        
        let title = (alert["title"] as? String)
            ?? (userInfo["title"] as? String)
            ?? "Cinacoin Notification"
        let body = (alert["body"] as? String)
            ?? (userInfo["body"] as? String)
            ?? ""
        
        let typeString = (userInfo["type"] as? String) ?? "other"
        let type = WalletNotificationType(rawValue: typeString) ?? .other
        
        let sessionId = userInfo["sessionId"] as? String
        let transactionData = userInfo["transaction"] as? [String: Any]
        
        return WalletNotification(
            type: type,
            title: title,
            body: body,
            sessionId: sessionId,
            transactionData: transactionData,
            userInfo: userInfo
        )
    }
}
