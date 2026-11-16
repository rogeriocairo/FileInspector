using FileInspector.API.Endpoints;
using FileInspector.API.Configuration;
using FileInspector.Application.DuplicateFiles;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddScoped<IDuplicateFileSearchService, DuplicateFileSearchService>();

var configuredFileRoot = builder.Configuration["FileSearch:AllowedRoot"] ?? "Files";
var allowedFileRoot = Path.GetFullPath(configuredFileRoot, builder.Environment.ContentRootPath);
Directory.CreateDirectory(allowedFileRoot);
builder.Services.AddSingleton(new DuplicateFileSearchOptions(allowedFileRoot));

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "FileInspector API v1");
    });
}

app.UseHttpsRedirection();
app.MapDuplicateFilesEndpoints();

app.Run();
