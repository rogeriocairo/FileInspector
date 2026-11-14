using FileInspector.API.Contracts.Files;
using FileInspector.Application.Files;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

namespace FileInspector.API.Endpoints;

public static class FilesEndpoints
{
    private const long MaxFileSizeBytes = 10 * 1024 * 1024;
    private const long MaxRequestSizeBytes = MaxFileSizeBytes + 64 * 1024;

    public static WebApplication MapFilesEndpoints(this WebApplication app)
    {
        app.MapPost("/api/files/inspect", InspectFileAsync)
            .WithName("InspectFile")
            .WithSummary("Inspect an uploaded file")
            .WithDescription(
                "Returns the uploaded file name, extension, size, declared content type, and SHA-256 hash. " +
                "The file is streamed and not persisted by the application. Maximum file size: 10 MiB.")
            .Accepts<FileInspectionUploadRequest>("multipart/form-data")
            .Produces<FileInspectionResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge)
            .WithMetadata(new RequestSizeLimitAttribute(MaxRequestSizeBytes));

        return app;
    }

    private static async Task<Results<Ok<FileInspectionResponse>, ProblemHttpResult>> InspectFileAsync(
        HttpRequest request,
        IFileInspectionService inspectionService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ContentType) ||
            !MediaTypeHeaderValue.TryParse(request.ContentType, out var mediaType) ||
            !string.Equals(mediaType.MediaType.Value, "multipart/form-data", StringComparison.OrdinalIgnoreCase))
        {
            return InvalidRequest("Content-Type must be multipart/form-data.");
        }

        var boundary = HeaderUtilities.RemoveQuotes(mediaType.Boundary).Value;
        if (string.IsNullOrWhiteSpace(boundary))
        {
            return InvalidRequest("The multipart boundary is missing.");
        }

        try
        {
            var reader = new MultipartReader(boundary, request.Body)
            {
                BodyLengthLimit = MaxRequestSizeBytes
            };
            var section = await reader.ReadNextSectionAsync(cancellationToken);
            if (section is null)
            {
                return InvalidRequest("Send one file using the multipart form field named 'file'.");
            }

            var headers = section.Headers;
            if (headers is null ||
                !headers.TryGetValue(HeaderNames.ContentDisposition, out var contentDispositionHeader) ||
                !ContentDispositionHeaderValue.TryParse(contentDispositionHeader.ToString(), out var contentDisposition) ||
                contentDisposition is null)
            {
                return InvalidRequest("The multipart file part has invalid content-disposition metadata.");
            }

            if (!string.Equals(
                    HeaderUtilities.RemoveQuotes(contentDisposition.Name).Value,
                    "file",
                    StringComparison.Ordinal))
            {
                return InvalidRequest("Send one file using the multipart form field named 'file'.");
            }

            var fileNameHeader = contentDisposition.FileNameStar.HasValue
                ? contentDisposition.FileNameStar
                : contentDisposition.FileName;
            var fileName = HeaderUtilities.RemoveQuotes(fileNameHeader).Value;
            if (string.IsNullOrWhiteSpace(fileName))
            {
                return InvalidRequest("The uploaded file must have a file name.");
            }

            var result = await inspectionService.InspectAsync(
                section.Body,
                fileName,
                section.ContentType,
                MaxFileSizeBytes,
                cancellationToken);

            if (await reader.ReadNextSectionAsync(cancellationToken) is not null)
            {
                return InvalidRequest("Send exactly one file using the multipart form field named 'file'.");
            }

            return TypedResults.Ok(new FileInspectionResponse(
                result.FileName,
                result.Extension,
                result.SizeInBytes,
                result.ContentType,
                result.Sha256));
        }
        catch (FileTooLargeException)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status413PayloadTooLarge,
                title: "File is too large",
                detail: "The maximum allowed file size is 10 MiB.");
        }
        catch (InvalidDataException)
        {
            return InvalidRequest("The multipart request is invalid or exceeds the request size limit.");
        }
    }

    private static ProblemHttpResult InvalidRequest(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status400BadRequest,
            title: "Invalid file upload",
            detail: detail);
}
