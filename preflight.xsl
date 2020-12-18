<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="xs"
    version="1.0"
    xml:space="default"
    >
    <xsl:strip-space  elements="*"/>
    <xsl:output indent="yes"/>
    <xsl:template match="/">
        <xsl:element name="PreflightReport">
            <xsl:attribute name="author">
                <xsl:text>CMI Publishing</xsl:text>
            </xsl:attribute>
            <xsl:attribute name="unit">
                <xsl:value-of select="/EnfocusReport/@unit"/>
            </xsl:attribute>
            <xsl:attribute name="datetime">
                <xsl:value-of select="/EnfocusReport/GeneralDocInfo/DocumentProperties/CreationDate"/>
            </xsl:attribute>
            <xsl:copy-of select="/EnfocusReport/ProcessInfo/PreflightProfile"/>
            <xsl:copy-of select="/EnfocusReport/GeneralDocInfo[1]/DocumentProperties/Title"/>
            <xsl:copy-of select="/EnfocusReport/GeneralDocInfo/DocumentProperties/DocumentName"/>
            <xsl:copy-of select="/EnfocusReport/GeneralDocInfo/DocumentProperties/PDFVersion"/>
            <xsl:copy-of select="/EnfocusReport/GeneralDocInfo/DocumentProperties/Creator"/>
            <xsl:element name="OutputIntent">
                <xsl:copy-of select="/EnfocusReport/OutputIntentInfo/DocumentOutputIntent/@type"/>
                <xsl:copy-of select="/EnfocusReport/OutputIntentInfo/DocumentOutputIntent/*"/>
            </xsl:element>
            <xsl:apply-templates/>
        </xsl:element>
    </xsl:template>

    <xsl:template match="Warnings|Errors">
        <xsl:variable name="name" select="name()"/>
        <xsl:for-each select="PreflightReportItem">
            <xsl:element name="{$name}">
                <xsl:copy-of select="./Message"/>
                <xsl:element name="Locations">
                    <xsl:copy-of select="./Location"/>
                </xsl:element>
            </xsl:element>                
        </xsl:for-each>
    </xsl:template>
    
    <xsl:template match="PageBoxInfo">
        <xsl:element name="PageBoxes">
            <xsl:element name="Trimbox">
                <xsl:copy-of select="Page/TrimBox/@width"/>
                <xsl:copy-of select="Page/TrimBox/@height"/>
                <xsl:copy-of select="Page/TrimBox/@minX"/>
                <xsl:copy-of select="Page/TrimBox/@minY"/>
                <xsl:copy-of select="Page/TrimBox/@maxX"/>
                <xsl:copy-of select="Page/TrimBox/@maxY"/>
            </xsl:element>
            <xsl:element name="Bleedbox">
                <xsl:copy-of select="Page/BleedBox/@width"/>
                <xsl:copy-of select="Page/BleedBox/@height"/>
                <xsl:copy-of select="Page/BleedBox/@minX"/>
                <xsl:copy-of select="Page/BleedBox/@minY"/>
                <xsl:copy-of select="Page/BleedBox/@maxX"/>
                <xsl:copy-of select="Page/BleedBox/@maxY"/>
            </xsl:element>
            <xsl:element name="Mediabox">
                <xsl:copy-of select="Page/MediaBox/@width"/>
                <xsl:copy-of select="Page/MediaBox/@height"/>
                <xsl:copy-of select="Page/MediaBox/@minX"/>
                <xsl:copy-of select="Page/MediaBox/@minY"/>
                <xsl:copy-of select="Page/MediaBox/@maxX"/>
                <xsl:copy-of select="Page/MediaBox/@maxY"/>
            </xsl:element>
        </xsl:element>
    </xsl:template>
    
    <xsl:template match="InkInfo">
        <xsl:element name="Inks">
            <xsl:for-each select=".//Ink">
                <xsl:element name="Ink">
                    <xsl:value-of select="./@name"/>
                </xsl:element>
            </xsl:for-each>            
        </xsl:element>
    </xsl:template>

    <xsl:template match="@*|node()">
        <xsl:apply-templates select="*|@*|node()"/>
    </xsl:template>
    
</xsl:stylesheet>