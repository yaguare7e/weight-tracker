package com.weighttracker.bridge

import android.util.Log
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object FirestoreClient {
    private const val TAG = "FirestoreClient"
    private const val PROJECT_ID = "wt-tracker-2026"
    private const val BASE_URL =
        "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents"

    fun saveWeight(syncKey: String, weightKg: Double): Boolean {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        val now = Date()
        val dateStr = dateFormat.format(now)
        val createdAt = isoFormat.format(now)
        val rounded = Math.round(weightKg * 10000.0) / 10000.0

        val json = """
            {
              "fields": {
                "weightKg": { "doubleValue": $rounded },
                "date": { "stringValue": "$dateStr" },
                "createdAt": { "stringValue": "$createdAt" }
              }
            }
        """.trimIndent()

        return try {
            val url = URL("$BASE_URL/users/$syncKey/weights")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 10_000
            conn.readTimeout = 10_000

            OutputStreamWriter(conn.outputStream).use { it.write(json) }

            val code = conn.responseCode
            conn.disconnect()

            if (code in 200..299) {
                Log.d(TAG, "Saved ${rounded}kg for date $dateStr")
                true
            } else {
                Log.e(TAG, "HTTP $code saving weight")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving weight", e)
            false
        }
    }
}
