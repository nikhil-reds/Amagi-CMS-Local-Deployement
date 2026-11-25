package com.amagi.screenplayer

import android.app.Activity
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.*
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.io.FilterInputStream
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private lateinit var web: WebView
    private val network = Executors.newFixedThreadPool(3)
    private val origin = "https://appassets.androidplatform.net"

    @Suppress("DEPRECATION", "SetJavaScriptEnabled")
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW // LAN HTTP media in the bundled HTTPS player.
            cacheMode = WebSettings.LOAD_NO_CACHE
        }
        val loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                if (request.url.host == "appassets.androidplatform.net" && request.url.path == "/player-media") return mediaResponse(request)
                // Android's MIME table does not consistently recognize PDF.js ES modules.
                val assetPath = request.url.path.orEmpty()
                if (request.url.host == "appassets.androidplatform.net" && assetPath.startsWith("/assets/") && assetPath.endsWith(".mjs") && !assetPath.contains("..")) {
                    return try { WebResourceResponse("text/javascript", "UTF-8", assets.open(assetPath.removePrefix("/assets/"))) }
                    catch (_: Exception) { WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", emptyMap(), null) }
                }
                return loader.shouldInterceptRequest(request.url)
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.isForMainFrame && request.url.toString() != "$origin/assets/index.html"
        }
        web.webChromeClient = WebChromeClient()
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            android.app.AlertDialog.Builder(this).setMessage("Update Android System WebView or Chrome to run XOS Player.").setPositiveButton("Close") { _, _ -> finish() }.show()
            return
        }
        // The bridge exists only on our bundled origin, never inside remote website frames.
        WebViewCompat.addWebMessageListener(web, "AndroidPlayer", setOf(origin)) { _, message, _, isMainFrame, reply ->
            if (!isMainFrame) return@addWebMessageListener
            try {
                val request = JSONObject(message.data ?: "{}")
                val id = request.getInt("id")
                fun respond(result: Any?, error: String? = null) {
                    val response = JSONObject().put("id", id).put("result", result ?: JSONObject.NULL)
                    if (error != null) response.put("error", error)
                    runOnUiThread { if (!isDestroyed) reply.postMessage(response.toString()) }
                }
                val prefs = getSharedPreferences("player", MODE_PRIVATE)
                when (request.getString("action")) {
                    "config" -> respond(JSONObject().put("serverUrl", prefs.getString("serverUrl", "")).put("screenId", prefs.getString("screenId", "")))
                    "save" -> {
                        prefs.edit().putString("serverUrl", request.getString("serverUrl")).putString("screenId", request.getString("screenId")).apply()
                        respond(true)
                    }
                    "quit" -> { respond(true); finish() }
                    "fetch" -> network.execute {
                        var connection: HttpURLConnection? = null
                        try {
                            val url = URL(request.getString("url"))
                            require(url.protocol == "http" || url.protocol == "https") { "Only HTTP(S) servers are supported" }
                            connection = url.openConnection() as HttpURLConnection
                            connection.connectTimeout = 20000
                            connection.readTimeout = 20000
                            connection.useCaches = false
                            connection.setRequestProperty("Accept", "application/json")
                            val status = connection.responseCode
                            if (status !in 200..299) throw IllegalStateException("HTTP $status")
                            val text = connection.inputStream.bufferedReader().use { it.readText() }
                            respond(JSONObject(text))
                        } catch (error: Exception) { respond(null, error.message ?: "Connection failed") }
                        finally { connection?.disconnect() }
                    }
                    else -> respond(null, "Unknown player action")
                }
            } catch (_: Exception) { /* Ignore malformed messages; no native action is performed. */ }
        }
        web.loadUrl("$origin/assets/index.html")
    }

    private fun mediaResponse(request: WebResourceRequest): WebResourceResponse {
        fun failed(status: Int) = WebResourceResponse("text/plain", "UTF-8", status, "Media unavailable", emptyMap(), null)
        var connection: HttpURLConnection? = null
        try {
            if (request.method != "GET") return failed(405)
            val target = URL(request.url.getQueryParameter("url") ?: return failed(400))
            val saved = getSharedPreferences("player", MODE_PRIVATE).getString("serverUrl", "").orEmpty()
            val server = URL(saved)
            val validPath = Regex("^/api/media/[^/]+$|^/api/screens/[^/]+/pdf/[^/]+$").matches(target.path)
            if (target.protocol !in listOf("http", "https") || target.protocol != server.protocol || target.host != server.host || target.port != server.port || !validPath) return failed(403)
            connection = target.openConnection() as HttpURLConnection
            connection.connectTimeout = 20000
            connection.readTimeout = 30000
            connection.useCaches = false
            connection.instanceFollowRedirects = false
            request.requestHeaders.entries.firstOrNull { it.key.equals("range", true) }?.let { connection.setRequestProperty("Range", it.value) }
            val status = connection.responseCode
            if (status !in 200..299) { connection.disconnect(); return failed(if (status in listOf(404, 416)) status else 502) }
            val headers = mutableMapOf("Access-Control-Allow-Origin" to origin, "Cache-Control" to "no-store")
            for (name in listOf("Content-Length", "Content-Range", "Accept-Ranges")) connection.getHeaderField(name)?.let { headers[name] = it }
            val activeConnection = connection
            val stream = object : FilterInputStream(connection.inputStream) {
                override fun close() { try { super.close() } finally { activeConnection.disconnect() } }
            }
            return WebResourceResponse(connection.contentType?.substringBefore(';') ?: "application/octet-stream", null, status, if (status == 206) "Partial Content" else "OK", headers, stream)
        } catch (_: Exception) { connection?.disconnect(); return failed(502) }
    }

    @Deprecated("Uses platform back callback for the player action menu")
    override fun onBackPressed() { web.evaluateJavascript("window.showPlayerActions?.()", null) }
    override fun onPause() { super.onPause(); web.onPause() }
    override fun onResume() { super.onResume(); if (::web.isInitialized) web.onResume() }
    override fun onDestroy() { web.destroy(); network.shutdownNow(); super.onDestroy() }
}
