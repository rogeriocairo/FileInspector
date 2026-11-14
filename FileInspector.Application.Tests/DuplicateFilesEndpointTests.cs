using System.Net;
using System.Text.Json;
using FileInspector.API.Configuration;
using FileInspector.API.Endpoints;
using FileInspector.Application.DuplicateFiles;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace FileInspector.Application.Tests;

public sealed class DuplicateFilesEndpointTests
{
    [Fact]
    public async Task GetDuplicates_SearchesWithinRelativeSubdirectoryOfConfiguredRoot()
    {
        using var directory = new TemporaryDirectory();
        var selectedDirectory = Directory.CreateDirectory(Path.Combine(directory.Path, "selected")).FullName;
        var nestedDirectory = Directory.CreateDirectory(Path.Combine(selectedDirectory, "nested")).FullName;
        CreateFile(Path.Combine(selectedDirectory, "duplicate.txt"), "first");
        CreateFile(Path.Combine(nestedDirectory, "DUPLICATE.txt"), "second");
        CreateFile(Path.Combine(directory.Path, "duplicate.txt"), "outside selected subdirectory");
        CreateFile(Path.Combine(directory.Path, "outside.txt"), "not a duplicate");

        await using var api = await DuplicateFilesTestApi.StartAsync(directory.Path);
        using var response = await api.Client.GetAsync("/api/files/duplicates?path=selected");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var duplicates = body.RootElement.EnumerateArray().ToArray();

        Assert.Equal(2, duplicates.Length);
        Assert.All(duplicates, duplicate =>
        {
            Assert.StartsWith(
                selectedDirectory + Path.DirectorySeparatorChar,
                duplicate.GetProperty("fullPath").GetString(),
                StringComparison.OrdinalIgnoreCase);
            Assert.True(duplicate.GetProperty("sizeInBytes").GetInt64() > 0);
            var lastModifiedUtc = DateTimeOffset.Parse(duplicate.GetProperty("lastModifiedUtc").GetString()!);
            Assert.Equal(TimeSpan.Zero, lastModifiedUtc.Offset);
        });
    }

    [Fact]
    public async Task GetDuplicates_WithoutPathSearchesConfiguredBaseDirectory()
    {
        using var directory = new TemporaryDirectory();
        var nestedDirectory = Directory.CreateDirectory(Path.Combine(directory.Path, "nested")).FullName;
        CreateFile(Path.Combine(directory.Path, "duplicate.txt"), "first");
        CreateFile(Path.Combine(nestedDirectory, "DUPLICATE.txt"), "second");

        await using var api = await DuplicateFilesTestApi.StartAsync(directory.Path);
        using var response = await api.Client.GetAsync("/api/files/duplicates");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        Assert.Equal(2, body.RootElement.GetArrayLength());
    }

    [Theory]
    [InlineData("..%2F..")]
    [InlineData("%2E%2E%5C%2E%2E")]
    public async Task GetDuplicates_RejectsPathTraversal(string encodedPath)
    {
        using var directory = new TemporaryDirectory();
        await using var api = await DuplicateFilesTestApi.StartAsync(directory.Path);

        using var response = await api.Client.GetAsync($"/api/files/duplicates?path={encodedPath}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetDuplicates_RejectsAbsolutePath()
    {
        using var directory = new TemporaryDirectory();
        await using var api = await DuplicateFilesTestApi.StartAsync(directory.Path);
        var absolutePath = Uri.EscapeDataString(directory.Path);

        using var response = await api.Client.GetAsync($"/api/files/duplicates?path={absolutePath}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetDuplicates_ReturnsNotFoundForMissingSubdirectory()
    {
        using var directory = new TemporaryDirectory();
        await using var api = await DuplicateFilesTestApi.StartAsync(directory.Path);

        using var response = await api.Client.GetAsync("/api/files/duplicates?path=missing");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDuplicates_OpenApiDocumentsOptionalPathQueryParameter()
    {
        using var directory = new TemporaryDirectory();
        await using var api = await DuplicateFilesTestApi.StartAsync(directory.Path);

        using var response = await api.Client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var parameters = body.RootElement
            .GetProperty("paths")
            .GetProperty("/api/files/duplicates")
            .GetProperty("get")
            .GetProperty("parameters")
            .EnumerateArray()
            .ToArray();
        var pathParameter = Assert.Single(parameters, parameter =>
            parameter.GetProperty("name").GetString() == "path");

        Assert.Equal("query", pathParameter.GetProperty("in").GetString());
        Assert.False(pathParameter.TryGetProperty("required", out var required) && required.GetBoolean());
        Assert.Contains(
            "Leave blank",
            pathParameter.GetProperty("description").GetString(),
            StringComparison.OrdinalIgnoreCase);
    }

    private static void CreateFile(string path, string contents)
    {
        File.WriteAllText(path, contents);
    }

    private sealed class DuplicateFilesTestApi : IAsyncDisposable
    {
        private readonly WebApplication _application;

        private DuplicateFilesTestApi(WebApplication application)
        {
            _application = application;
            Client = application.GetTestClient();
        }

        public HttpClient Client { get; }

        public static async Task<DuplicateFilesTestApi> StartAsync(string allowedRoot)
        {
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions
            {
                EnvironmentName = "Testing"
            });
            builder.WebHost.UseTestServer();
            builder.Services.AddOpenApi();
            builder.Services.AddSingleton(new DuplicateFileSearchOptions(allowedRoot));
            builder.Services.AddScoped<IDuplicateFileSearchService, DuplicateFileSearchService>();

            var application = builder.Build();
            application.MapOpenApi();
            application.MapDuplicateFilesEndpoints();
            await application.StartAsync();

            return new DuplicateFilesTestApi(application);
        }

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await _application.DisposeAsync();
        }
    }

    private sealed class TemporaryDirectory : IDisposable
    {
        public TemporaryDirectory()
        {
            Path = System.IO.Path.Combine(
                System.IO.Path.GetTempPath(),
                $"FileInspectorApiTests-{Guid.NewGuid():N}");
            Directory.CreateDirectory(Path);
        }

        public string Path { get; }

        public void Dispose()
        {
            if (Directory.Exists(Path))
            {
                Directory.Delete(Path, recursive: true);
            }
        }
    }
}
