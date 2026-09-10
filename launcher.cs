using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;

namespace OnDoubtUseUs
{
    class Program
    {
        static bool IsPortInUse(int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(350);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        static string FindProjectRoot()
        {
            string current = AppDomain.CurrentDomain.BaseDirectory;
            for (int i = 0; i < 4; i++)
            {
                if (File.Exists(Path.Combine(current, "local-server.mjs")))
                {
                    return current;
                }
                var parent = Directory.GetParent(current);
                if (parent == null) break;
                current = parent.FullName;
            }

            string fallback = @"c:\Users\jgbar\OneDrive\Documentos\ODUU";
            if (Directory.Exists(fallback) && File.Exists(Path.Combine(fallback, "local-server.mjs")))
            {
                return fallback;
            }

            return AppDomain.CurrentDomain.BaseDirectory;
        }

        static void Main(string[] args)
        {
            Console.Title = "ODUU :) — Blue Lab Utility Console";
            Console.OutputEncoding = System.Text.Encoding.UTF8;

            Console.ForegroundColor = ConsoleColor.Blue;
            Console.WriteLine(@"
   ===================================================================
     :)  ON DOUBT, USE US  //  BLUE LAB EXPERIMENTAL UTILITIES
   ===================================================================
     Engine: Node.js + yt-dlp + ffmpeg  |  Console: v1.2.0 ACTIVE
     Status: Local-first media ingestion & stream processor
   ===================================================================
            ");
            Console.ResetColor();

            string projectDir = FindProjectRoot();
            int port = 8787;
            bool isAlreadyRunning = IsPortInUse(port);
            Process serverProcess = null;

            if (!isAlreadyRunning)
            {
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine(" > Inicializando motor local (local-server.mjs)...");
                Console.ResetColor();

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = "local-server.mjs",
                    WorkingDirectory = projectDir,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                try
                {
                    serverProcess = Process.Start(psi);
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine(" [ERRO FATAL] Não foi possível iniciar o runtime Node.js: " + ex.Message);
                    Console.WriteLine(" Certifique-se de ter o Node.js v20+ instalado no seu sistema.");
                    Console.ResetColor();
                    Console.WriteLine("\nPressione qualquer tecla para fechar...");
                    Console.ReadKey();
                    return;
                }

                int attempts = 0;
                while (attempts < 30 && !IsPortInUse(port))
                {
                    Thread.Sleep(200);
                    attempts++;
                }
            }

            string appUrl = "http://127.0.0.1:" + port;
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine(" [OK] Motor ativo em " + appUrl);
            Console.WriteLine(" [OK] Lançando interface de aplicação...");
            Console.ResetColor();

            try
            {
                Process.Start(new ProcessStartInfo(appUrl) { UseShellExecute = true });
            }
            catch
            {
                try { Process.Start("explorer.exe", appUrl); } catch { }
            }

            string downloadsFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "On Doubt Use Us");

            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("\n   -------------------------------------------------------------------");
            Console.WriteLine("   Destino local : " + downloadsFolder);
            Console.WriteLine("   Status        : Pronto para processar vídeos, áudios e playlists.");
            Console.WriteLine("   -------------------------------------------------------------------");
            Console.WriteLine("   Mantenha este console ativo enquanto utilizar o aplicativo.");
            Console.WriteLine("   Pressione qualquer tecla para encerrar o motor e fechar.");
            Console.WriteLine("   -------------------------------------------------------------------\n");
            Console.ResetColor();

            Console.ReadKey();

            if (serverProcess != null && !serverProcess.HasExited)
            {
                try
                {
                    serverProcess.Kill();
                }
                catch { }
            }
        }
    }
}
