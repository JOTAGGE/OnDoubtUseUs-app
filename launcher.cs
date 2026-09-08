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
                    bool success = result.AsyncWaitHandle.WaitOne(400);
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

        static void Main(string[] args)
        {
            Console.Title = "On Doubt, Use Us :) — Blue Lab Utility";
            Console.OutputEncoding = System.Text.Encoding.UTF8;

            Console.ForegroundColor = ConsoleColor.Blue;
            Console.WriteLine(@"
   ===========================================================
     :)  ON DOUBT, USE US  //  BLUE LAB EXPERIMENTAL UTILITY
   ===========================================================
   Sempre gratuito. Sem limites. Sem anúncios. Sem enrolação.
            ");
            Console.ResetColor();

            // Localiza a pasta raiz do projeto
            string projectDir = @"c:\Users\jgbar\OneDrive\Documentos\ODUU";
            if (!Directory.Exists(projectDir))
            {
                projectDir = AppDomain.CurrentDomain.BaseDirectory;
            }

            int port = 8787;
            bool isAlreadyRunning = IsPortInUse(port);
            Process serverProcess = null;

            if (!isAlreadyRunning)
            {
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine(" > Inicializando motor de download e interface...");
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
                    Console.WriteLine(" [ERRO] Não foi possível iniciar o Node.js: " + ex.Message);
                    Console.WriteLine(" Certifique-se de que o Node.js está instalado no seu computador.");
                    Console.ResetColor();
                    Console.ReadLine();
                    return;
                }

                int attempts = 0;
                while (attempts < 25 && !IsPortInUse(port))
                {
                    Thread.Sleep(200);
                    attempts++;
                }
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine(" [OK] Servidor ativo em http://127.0.0.1:" + port);
            Console.WriteLine(" [OK] Abrindo navegador...");
            Console.ResetColor();

            string appUrl = "http://127.0.0.1:" + port;
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
            Console.WriteLine("\n   -----------------------------------------------------------");
            Console.WriteLine("   Destino local: " + downloadsFolder);
            Console.WriteLine("   Status: Pronto para baixar vídeos, áudios e playlists!");
            Console.WriteLine("   Mantenha esta janela aberta enquanto estiver usando.");
            Console.WriteLine("   Para encerrar o aplicativo, pressione qualquer tecla ou feche.");
            Console.WriteLine("   -----------------------------------------------------------\n");
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
